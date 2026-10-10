import React from 'react'
import { Alert, Collapse, Tag } from 'antd'
export const ecgGrades = { CRITICAL: '危急', WARNING: '预警', NORMAL: '普通', UNASSESSED: '待核实' }
export const ecgGuidance = { CRITICAL: '即刻就医诊治；即刻报告基层医疗单位或预留联系人。', WARNING: '及时告知基层医疗单位及患者，建议尽早就医。', NORMAL: '不适随诊，结合临床，择期就医。' }
export const ecgConsensusUrl = 'https://xadxyylib.yuntsg.com/ueditor/jsp/upload/file/20240322/1711075946561020247.pdf'
export function EcgGrade({ value }) { return <Tag color={{ CRITICAL: 'red', WARNING: 'gold', NORMAL: 'green' }[value]}>{ecgGrades[value] || '待核实'}</Tag> }
export default function EcgGradingGuide() {
  return <Collapse className="mb" items={[{ key: 'guide', label: '分级依据 · 远程心电图危险分级诊断的中国专家共识（2022）', children: <>
    <div className="screening-work-items">{Object.entries(ecgGuidance).map(([key, text]) => <div key={key}><EcgGrade value={key} /><p>{text}</p></div>)}</div>
    <Alert type="info" showIcon message="仅针对本次心电图，不替代患者整体风险分层" description="适用于 10 秒有效静息、12 导联及以上远程传输心电图；波形失真、远程动态及长时程实时监测不在其直接适用范围。单导联或其他多导联的心律失常可参照分级，不用于心肌缺血诊断分级。AI 结果须人工审核，资料不足保持待核实。" />
    <p>危急条目包括疑似急性冠脉综合征的相应心电改变、严重快速或缓慢性心律失常、特定束支阻滞及其他高危心电表现。病种名称本身不足以确定等级，须核对导联、波形、速率、持续时间、既往心电图、症状和血流动力学等适用条件。</p>
    <p>“新发生房扑 / 房颤”列在预警条目；“房颤伴心室预激且最短 RR ≤250 ms”列在危急条目。具体条件及例外以原文为准，不自动计算或据关键词判级。</p>
    <a href={ecgConsensusUrl} target="_blank" rel="noreferrer">查看共识原文（《临床心电学杂志》2022，31(6)：401–405；第 403 页表 1 与临床规范）↗</a>
  </> }]} />
}
