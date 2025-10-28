import { time } from 'console';
import { Kafka, Producer } from 'kafkajs';

export class KafkaBroker {
    private kafka: Kafka;
    private producer: Producer;
    constructor() {
        this.kafka = new Kafka({
            clientId: 'my-app',
            brokers: ['kafka:9092']
        })
        this.producer = this.kafka.producer();
    }

    async producerConnect() {
        await this.producer.connect();
    }

    async producerSend(msg: string) {
        const date = new Date();

        const data: Object = {
            "site_name": "wildberries",
            "url": "https://wildberries.ru",
            "msg": msg,
            "date": date.toLocaleDateString()
        }
        await this.producer.send({
            topic: 'test-topic',
            messages: [
              { value: JSON.stringify(data) },
            ],
          });
    }

    async producerDisconnect() {
        await this.producer.disconnect();
    }
}
