package com.boruikang.health.patient.service;

import com.boruikang.health.patient.dto.*;
import com.boruikang.health.common.Checks;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.csv.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.time.LocalDate;
import java.util.*;

/** Parse and validate the entire bounded file before invoking transactional persistence. */
@Service
public class PatientFileImportService {
 private final PatientService patients; private final PatientAccess access; private final Validator validator;
 public PatientFileImportService(PatientService patients, PatientAccess access, Validator validator) { this.patients=patients; this.access=access; this.validator=validator; }
 public ImportPatientsResponse upload(ImportPatientFileRequest meta, MultipartFile file) {
  access.operations();
  Checks.require(!file.isEmpty() && file.getSize()<=5*1024*1024, "文件为空或超过 5 MiB");
  String name=Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
  Checks.require(name.endsWith(".csv")||name.endsWith(".xlsx"), "仅支持 .xlsx 或 .csv 文件");
  List<List<String>> cells;
  try { cells=name.endsWith(".csv") ? csv(file.getBytes()) : excel(file.getInputStream()); }
  catch (com.boruikang.health.common.exception.BizException e) { throw e; }
  catch (Exception e) { throw new IllegalArgumentException("文件无法解析"); }
  List<ImportPatientsRequest.Row> rows=rows(cells);
  return patients.importRows(new ImportPatientsRequest(meta.importBatch(),meta.doctorId(),meta.ownerId(),meta.patientType(),meta.sourceScene(),meta.orgId(),meta.outreach(),rows));
 }
 private List<List<String>> csv(byte[] bytes) throws Exception {
  String text;
  try { text=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString(); }
  catch(CharacterCodingException e) { text=Charset.forName("GB18030").newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString(); }
  if(text.startsWith("\uFEFF"))text=text.substring(1);
  List<List<String>> result=new ArrayList<>();
  try(CSVParser parser=CSVFormat.DEFAULT.builder().setIgnoreEmptyLines(true).get().parse(new StringReader(text))) {
   for(CSVRecord record:parser) { Checks.require(record.size()<=64,"文件列数超过 64"); List<String> row=new ArrayList<>();record.forEach(row::add); if(row.stream().anyMatch(v->!v.isBlank())) { result.add(row);Checks.require(result.size()<=501,"最多导入 500 条"); } }
  } return result;
 }
 private List<List<String>> excel(InputStream in) throws Exception {
  try(in; XSSFWorkbook book=new XSSFWorkbook(in)) {
   DataFormatter formatter=new DataFormatter(Locale.ROOT);
   for(Sheet sheet:book) {
    List<List<String>> result=new ArrayList<>();
    for(org.apache.poi.ss.usermodel.Row record:sheet) {
     Checks.require(record.getLastCellNum()<=64,"文件列数超过 64"); List<String> row=new ArrayList<>();
     for(int i=0;i<record.getLastCellNum();i++) { Cell c=record.getCell(i);Checks.require(c==null||(c.getCellType()!=CellType.FORMULA&&c.getCellType()!=CellType.ERROR),"请将公式转为值后上传");row.add(c==null?"":c.getCellType()==CellType.NUMERIC&&DateUtil.isCellDateFormatted(c)?c.getLocalDateTimeCellValue().toLocalDate().toString():formatter.formatCellValue(c)); }
     if(row.stream().anyMatch(v->!v.isBlank())) { result.add(row);Checks.require(result.size()<=501,"最多导入 500 条"); }
    } if(!result.isEmpty())return result;
   } return List.of();
  }
 }
 private static final Map<String,String> HEADERS=new HashMap<>();
 static {
  String[][] aliases={{"name","姓名","患者姓名"},{"gender","性别"},{"age","年龄"},{"phone","联系电话","手机号","手机号码","电话"},{"department","科室"},{"disease","病种/管理原因","病种","疾病","管理原因"},{"external_id","来源编号","患者编号","外部编号"},{"id_card","身份证号","身份证","证件号"},{"birth_date","出生日期"},{"address","住址","地址"},{"emergency_contact","紧急联系人"},{"emergency_phone","紧急联系电话","紧急联系人电话"},{"inpatient_no","住院号"},{"bed_no","床号"},{"note","备注","内部备注"}};
  for(String[] group:aliases)for(String alias:group)HEADERS.put(alias,group[0]);
 }
 private List<ImportPatientsRequest.Row> rows(List<List<String>> cells) {
  Checks.require(cells.size()>1,"文件没有患者数据");Map<String,Integer> cols=new HashMap<>();Set<String> seen=new HashSet<>();
  for(int i=0;i<cells.getFirst().size();i++) { String header=cells.getFirst().get(i).trim();Checks.require(seen.add(header),"表头重复");String key=HEADERS.get(header);if(key!=null)Checks.require(cols.put(key,i)==null,"同一字段存在重复表头"); }
  for(String required:List.of("name","age","phone","department","disease"))Checks.require(cols.containsKey(required),"缺少必填列："+required);
  List<ImportPatientsRequest.Row> result=new ArrayList<>();
  for(int i=1;i<cells.size();i++) {
   List<String> values=cells.get(i);Checks.require(values.size()<=cells.getFirst().size(),"文件第 "+(i+1)+" 行列数不正确");
   java.util.function.Function<String,String> get=key->{int c=cols.getOrDefault(key,-1);return c<0||c>=values.size()||values.get(c).isBlank()?null:values.get(c).trim();};
   try {
    String gender=get.apply("gender");gender=gender==null?"UNKNOWN":switch(gender){case "男","MALE"->"MALE";case "女","FEMALE"->"FEMALE";case "未知","UNKNOWN"->"UNKNOWN";default->gender;};
    String birthday=get.apply("birth_date");
    var row=new ImportPatientsRequest.Row(get.apply("name"),gender,Integer.valueOf(get.apply("age")),get.apply("phone"),get.apply("department"),get.apply("disease"),get.apply("external_id"),get.apply("id_card"),birthday==null?null:LocalDate.parse(birthday),get.apply("address"),get.apply("emergency_contact"),get.apply("emergency_phone"),get.apply("inpatient_no"),get.apply("bed_no"),get.apply("note"));
    var invalid=validator.validate(row);Checks.require(invalid.isEmpty(),"文件第 "+(i+1)+" 行字段校验失败："+invalid.stream().map(v->v.getPropertyPath().toString()).sorted().toList());result.add(row);
   } catch(NumberFormatException|java.time.format.DateTimeParseException e) { Checks.require(false,"文件第 "+(i+1)+" 行年龄或日期格式不正确"); }
  } return result;
 }
}
