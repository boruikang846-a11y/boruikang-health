# HEALTH 1.7 随访建议生成契约

前缀 A=`/boruikang/admin`。响应仍为 `{code,message,success,result}`。

| 方法与路径 | 变化 |
| --- | --- |
| GET A/integrations | AI 项返回 endpoint、model_name、enabled、configured、status。不返回 secret。未配置或存量端点非 DeepSeek 时返回 DeepSeek 默认端点、`deepseek-flash`、enabled=false、configured=false、status=NOT_CONFIGURED，不写数据库 |
| POST A/integrations/save | 运营主管或平台管理员。`provider=AI`，`endpoint` 固定 `https://api.deepseek.com/chat/completions`，其他端点返回 400。`model_name` 只能是 `deepseek-flash` 或 `deepseek-v4-pro`。`secret` 留空仅保留同一 DeepSeek 端点的原值；不能沿用其他接口的密钥。启用时必须已有 DeepSeek 密钥。其他角色 403 |
| POST A/tasks/draft | `mode=AI` 时读取任务关联病历正文再调用已启用接口。无正文返回 400，调用失败返回 502，两种情况都不更新草稿。成功后 `draft_origin=AI` |

DeepSeek 请求为 Chat Completions，`thinking.type=disabled`，`stream=false`。保存与生成均校验唯一官方端点；历史其他端点无法发起调用。表结构不变，不需要清库；全量种子默认值保持 DeepSeek，不覆盖已有配置。

2026-10-01 核对 [DeepSeek 官方 Chat Completions 文档](https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/)：POST `/chat/completions` 支持上述两个模型、`messages` 与非思考模式；使用 Bearer API Key，正文来自 `choices[0].message.content`。本功能不依赖回调；限流、余额不足、超时均按调用失败处理，不自动重试、不改草稿。真实调用仍需管理员提供有效密钥与可用额度。
