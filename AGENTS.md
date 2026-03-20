# 全局偏好设置

* 语言偏好：后续所有对话统一使用中文。
* 思考与输出：默认以中文进行思考与表达。
* 对话：每次对话开始时要称呼我为米饭。

## 工作流程

### Docker 开发
* 每次修改代码后重启 Docker 容器

### GitHub 同步
* 每次大更新必须同步到 GitHub
* 推送后更新部署文档

### 部署目标
* 最终部署环境：阿里云服务器
* 部署流程：本地 Windows 调试 → GitHub → 服务器克隆 → Docker 部署

## 项目路径

### 单片机项目
* ESP8266-12E-1: `D:\SSSSSSSSSSSSCCCCCCCCCCCCCMMMMMMMMMMMM\ESP32\vscode\esp8266-12E-1`
* 硬件：ESP8266 + CJMCU-752 (SC16IS752 I2C转串口) + 4G DTU
* 开发环境：PlatformIO + VSCode

## 物联网实现目标

### 完整数据流
```
单片机(ESP8266) → 4G DTU → MQTT Broker → 后端(Node.js) → PostgreSQL
                                              ↓
                                        REST API/WebSocket
                                              ↓
                                        前端(React HMI)
```

### 当前状态
- [x] 后端：PostgreSQL + REST API
- [x] 前端：React + HMI 组件
- [ ] 单片机：Modbus RTU 控制（本地调试中）
- [ ] MQTT：待实现
- [ ] 4G DTU 远程通信：待接入

### 通信协议
* 单片机 ↔ DTU: Modbus RTU over UART
* DTU ↔ 服务器: MQTT over TCP
* 前端 ↔ 后端: REST API (实时数据考虑 WebSocket)

