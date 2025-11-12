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
            "site_name": "avito",
            "msg": msg,
            "date": this.formatDate(date)
        }
        await this.producer.send({
            topic: 'scraper_data',
            messages: [
              { value: JSON.stringify(data) },
            ],
          });
    }

    async producerDisconnect() {
        await this.producer.disconnect();
    }

    private formatDate(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Месяцы 0-индексированы
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }
}
