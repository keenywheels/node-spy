import path from 'path';
import fs from 'fs';
import { exec } from "child_process";
import { CronJob } from 'cron';

function readConfig(configPath = './config_scheduler.json') {
  const configFile = fs.readFileSync(path.resolve(configPath), 'utf8');
  const configData = JSON.parse(configFile);
  return configData;
}

function runApp(sites) {
  console.log(new Date().toISOString(), "job start");
  for (const site of sites) {
    console.log(new Date().toISOString(), `run app for ${site.site_name}`);
    exec(`bash run-app.sh ${site.site_name} ${site.url}`, (err, stdout, stderr) => {
      console.log(stdout);
      console.log(err);
      console.error(stderr);
    });
  }
}

function runCron(config) {
  const job = new CronJob(
    config.cronPattern, // cronTime
    () => {
      runApp(config.sites)
    }, // onTick
    null, // onComplete
    true, // start
    //'Europe/Moscow' // timeZone
  );
  job.start();
}

const config = readConfig('./config_scheduler.json');
runCron(config);