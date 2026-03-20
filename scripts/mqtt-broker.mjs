import aedes from 'aedes'
import { createServer } from 'net'

const instance = aedes()
const server = createServer(instance.handle)
const port = 1883

server.listen(port, function () {
  console.log(`[MQTT Broker] 运行在端口 ${port}`)
  console.log(`[MQTT Broker] 设备可连接: mqtt://8.136.109.228:1883`)
})

instance.on('client', function (client) {
  console.log(`[MQTT] 客户端连接: ${client.id}`)
})

instance.on('clientDisconnect', function (client) {
  console.log(`[MQTT] 客户端断开: ${client.id}`)
})

instance.on('publish', function (packet, client) {
  if (client) {
    const topic = packet.topic
    const payload = packet.payload.toString()
    console.log(`[MQTT] 收到消息`)
    console.log(`  主题: ${topic}`)
    console.log(`  数据: ${payload}`)
    console.log(`  来源: ${client.id}`)
    console.log('---')
  }
})

instance.on('subscribe', function (subscriptions, client) {
  console.log(`[MQTT] 订阅: ${subscriptions.map(s => s.topic).join(', ')} (来自 ${client.id})`)
})