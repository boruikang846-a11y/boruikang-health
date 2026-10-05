import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.regex.*;

/** Read-only schema check. Credentials stay in the supplied properties file. */
class CheckDatabaseSchema {
 public static void main(String[] args) throws Exception {
  if(args.length!=2) throw new IllegalArgumentException("Usage: CheckDatabaseSchema <application-profile.properties> <DDL.sql>");
  Properties config=new Properties();try(var reader=Files.newBufferedReader(Path.of(args[0]))){config.load(reader);}
  Properties login=new Properties();login.setProperty("user",config.getProperty("spring.datasource.username"));login.setProperty("password",config.getProperty("spring.datasource.password"));login.setProperty("connectTimeout","10000");login.setProperty("socketTimeout","10000");
  Map<String,Set<String>> expected=new TreeMap<>();
  Matcher tables=Pattern.compile("CREATE TABLE IF NOT EXISTS (\\w+)\\s*\\(([\\s\\S]*?)\\);",Pattern.CASE_INSENSITIVE).matcher(Files.readString(Path.of(args[1])));
  while(tables.find()) {Set<String> columns=new TreeSet<>();Matcher column=Pattern.compile("(?:^|[\\n,])\\s*(\\w+)\\s+(?:BIGINT|INT|TINYINT|BOOLEAN|VARCHAR|DATETIME|DATE|TEXT|LONGTEXT|DECIMAL)",Pattern.CASE_INSENSITIVE).matcher(tables.group(2));while(column.find())columns.add(column.group(1));expected.put(tables.group(1),columns);}
  boolean drift=false;
  try(Connection connection=DriverManager.getConnection(config.getProperty("spring.datasource.url"),login)) {
   connection.setReadOnly(true);Map<String,Set<String>> actual=new TreeMap<>();
   try(var query=connection.prepareStatement("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION");var rows=query.executeQuery()) {while(rows.next())actual.computeIfAbsent(rows.getString(1),key->new TreeSet<>()).add(rows.getString(2));}
   for(var table:expected.entrySet()) {Set<String> found=actual.getOrDefault(table.getKey(),Set.of()),missing=new TreeSet<>(table.getValue()),extra=new TreeSet<>(found);missing.removeAll(found);extra.removeAll(table.getValue());if(!missing.isEmpty()||!extra.isEmpty()){drift=true;System.out.println(table.getKey()+": missing="+missing+" extra="+extra);}}
   System.out.println("Read-only schema check: "+expected.size()+" expected tables; "+(drift?"DRIFT":"MATCH"));
  } catch(SQLException exception) {System.out.println("Read-only database check unavailable: SQLState="+exception.getSQLState()+"; vendorCode="+exception.getErrorCode());System.exit(3);}
  if(drift)System.exit(2);
 }
}
