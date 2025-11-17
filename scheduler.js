import { exec } from "child_process";
import { CronJob } from 'cron';

function run_app() {
  exec("bash run-app.sh wildberries https://wildberries.ru", (err, stdout, stderr) => {
    console.log(new Date().toISOString(), "job start");
    console.log(stdout);
    console.log(err);
    console.error(stderr);
  });
}

function run_cron() {
    const job = new CronJob(
      '3 * * * *', // cronTime
      run_app, // onTick
      null, // onComplete
      true, // start
      //'Europe/Moscow' // timeZone
    );
    job.start();
}

run_cron();