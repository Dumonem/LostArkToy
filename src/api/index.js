import Router from 'koa-router';
import * as apiCtrl from './ctrl';

const api = new Router();

api.get('/getMarketList', apiCtrl.getMarketList);
api.get('/getMarketItem/:itemNo', apiCtrl.getMarketItem);
api.get('/getMaterialList', apiCtrl.getMaterialList);
api.patch('/addMaterial/:itemNo', apiCtrl.addMaterial);
api.get('/calculate', apiCtrl.calculate);

export default api;
