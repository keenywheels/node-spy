#!/bin/sh

cd /opt/kafka/bin/
./kafka-topics.sh --bootstrap-server ${KAFKA_HOST}:9092 --create --topic scraper_data --if-not-exists
