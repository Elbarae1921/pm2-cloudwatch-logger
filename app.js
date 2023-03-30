
var pmx = require('pmx');
const pm2 = require('pm2');

const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const winstonCloudwatchTransport = new WinstonCloudWatch({
  logGroupName: 'mbf-prod',
  logStreamName: 'first',
  awsOptions: {
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    },
    region: 'eu-west-3'
  },
});

const logger = winston.createLogger({
    transports: [winstonCloudwatchTransport]
});

pmx.initModule({
  widget : {
    logo: 'https://app.keymetrics.io/img/logo/keymetrics-300.png',
    theme: ['#141A1F', '#222222', '#3ff', '#3ff'],
    el: {
      probes  : true,
      actions : true
    },
    block: {
      actions: false,
      issues: true,
      meta: true
    }
  }
}, function(err, conf) {

    const { module_name } = conf;

    pm2.connect(function (err) {
        if (err) return console.log('PM2 CloudWatch:', err.stack || err);
        pm2.launchBus(function (err, bus) {
            if (err) return console.log('PM2 CloudWatch:', err);

            console.log('PM2 CloudWatch: Bus Connected');

            bus.on('log:out', function (log) {
                if (log.process.name !== module_name) {
                    pm2.list(function (err, list) {
                        const pm2Apps = list.map(x => x.name);
                        if (pm2Apps.indexOf(log.process.name) > -1) {
                            // console.log(log.data);
                            logger.info(log.data);
                        }
                    });
                }
            });

            bus.on('log:err', function (log) {
                if (log.process.name !== module_name) {
                    pm2.list(function (err, list) {
                        const pm2Apps = list.map(x => x.name);
                        if (pm2Apps.indexOf(log.process.name) > -1) {
                            // console.log(log.data);
                            logger.error(log.data);
                        }
                    });
                }
            });

            bus.on('reconnect attempt', function () {
                console.log('PM2 CloudWatch: Bus reconnecting');
            });
    
            bus.on('close', function () {
                console.log('PM2 CloudWatch: Bus closed');
            });
        });
    });
});
