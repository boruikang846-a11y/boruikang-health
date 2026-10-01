# HEALTH 1.7 随访建议生成契约

前缀 A=`/bgssai/admin`。响应仍为 `{code,message,success,result}`。

| 方法与路径 | 变化 |
| --- | --- |
| GET A/integrations | AI 项返回 endpoint、model_name、enabled、configured、status。不返回 secret。未配置时默认端点为 `https://api.deepseek.com/chat/completions`，模型 `deepseek-flash` |
| POST A/integrations/save | 运营主管或平台管理员。`provider=AI`，`endpoint` 只能是 DeepSeek `https://api.deepseek.com/chat/completions`，或既有两个 TokenHub 地址。DeepSeek 的 `model_name` 只能是 `deepseek-flash` 或 `deepseek-v4-pro`。`secret` 留空则保留原值。启用时必须已有密钥。其他角色 403 |
| POST A/tasks/draft | `mode=AI` 时读取任务关联病历正文再调用已启用接口。无正文返回 400，调用失败返回 502，两种情况都不更新草稿。成功后 `draft_origin=AI` |

DeepSeek 请求为 Chat Completions，`thinking.type=disabled`，`stream=false`。TokenHub 请求不带 thinking 字段。
