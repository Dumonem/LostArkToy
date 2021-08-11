require('dotenv').config();
import cron from 'node-cron';
import mongoose from 'mongoose';
import Koa from 'koa';
import Router from 'koa-router';
import BodyParser from 'koa-bodyparser';
import api from './api';
import * as apiCtrl from './api/ctrl';

const { MONGO_URI } = process.env;

mongoose
	.connect(MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
	})
	.then(() => {
		console.info('Connected to MongoDB');
	})
	.catch((e) => {
		console.info(e);
	});

const app = new Koa();
const router = new Router();

router.use('/api', api.routes());
app.use(BodyParser());
app.use(router.routes()).use(router.allowedMethods());
app.listen(4000, () => {
	console.log('Listening to port 4000');
});
process.on('uncaughtException', (err) => {
	console.log('예기치 못한 에러', err);
});

cron.schedule(
	'*/5 * * * *',
	() => {
		apiCtrl.getMarketList().then(
			() => {
				console.log('데이터 입력 성공');
			},
			(reason) => {
				console.log('데이터 입력 실패:' + reason);
			}
		);
	},
	{}
);
