import axios from 'axios';
import * as cheerio from 'cheerio';
import Market from '../models/market';
import Joi from 'joi';

export const insertMarketList = async () => {
	try {
		let page = 1;
		let maxPage = 99;
		do {
			let res = await axios.get(
				'https://lostark.game.onstove.com/Market/List_v2?firstCategory=90000&itemName=&pageNo=' +
					page +
					'&isInit=false&sortType=7'
			);
			addData(res, 90000);
			page++;
		} while (page <= maxPage);
		page = 1;
		maxPage = 99;
		do {
			let res = await axios.get(
				'https://lostark.game.onstove.com/Market/List_v2?firstCategory=60000&itemName=&pageNo=' +
					page +
					'&isInit=false&sortType=7'
			);
			addData(res, 60000);
			page++;
		} while (page <= maxPage);
		let res = await axios.get(
			'https://lostark.game.onstove.com/Market/List_v2?firstCategory=50000&itemName=%EC%98%A4%EB%A0%88%ED%95%98&pageNo=&isInit=false&sortType=7'
		);
		addData(res, 50000);
		// await calculate();
	} catch (e) {
		console.error(e);
	}
};

const addData = (res, category) => {
	let $ = cheerio.load(res.data);
	$('#tbodyItemList tr').each(async (i, el) => {
		const itemNo = $(el).find('.button--deal-buy').attr('data-itemno');
		const itemName = $(el).find('.name').html();
		const lowPrice = $(el)
			.find('.price:last')
			.text()
			.replace(/[^0-9]/g, '');
		const sellPrice = $(el)
			.find('.price:eq(1)')
			.text()
			.replace(/[^0-9]/g, '');
		const count = $(el)
			.find('.count')
			.text()
			.replace(/[^0-9]/g, '');
		if (!itemNo) {
			return;
		}
		await Market.findOneAndUpdate(
			{
				itemNo: itemNo,
			},
			{
				itemName: itemName,
				lowPrice: lowPrice,
				sellPrice: sellPrice,
				count: count,
				category: category,
			},
			{
				new: true,
				upsert: true,
			}
		);
	});
};

export const getMarketList = async (ctx) => {
	ctx.body = await Market.aggregate([
		{ $match: { category: { $ne: 90000 } } },
		{
			$project: {
				itemDescription: {
					$ifNull: [
						{
							$concat: [
								'$itemName',
								'[',
								{ $toString: '$count' },
								'개 단위 판매]',
							],
						},
						'$itemName',
					],
				},
				itemName: 1,
				itemNo: 1,
				lowPrice: 1,
				sellPrice: 1,
				category: 1,
				lowPriceMargin: 1,
				lowPriceUnderMargin: 1,
				lowPriceUpperMargin: 1,
			},
		},
	]);
};

export const getMarketItem = async (ctx) => {
	const { itemNo } = ctx.params;
	ctx.body = await Market.findOne({ itemNo: itemNo });
};

export const getMaterialList = async (ctx) => {
	ctx.body = await Market.aggregate([
		{ $match: { category: 90000 } },
		{ $project: { value: '$itemNo', label: '$itemName' } },
	]);
};

export const addMaterial = async (ctx) => {
	const schema = Joi.object().keys({
		material: Joi.array().items({
			//객체가 다음 필드를 가지고있는지 검증
			itemName: Joi.object().keys({
				_id: Joi.string(),
				label: Joi.string().required(),
				value: Joi.number().required(),
			}),
			itemCount: Joi.number().required(),
		}),
		charge: Joi.number().required(),
		makeCount: Joi.number().required(),
	});

	const result = schema.validate(ctx.request.body);
	if (result.error) {
		ctx.status = 400;
		ctx.body = result.error;
		return;
	}

	const { itemNo } = ctx.params;
	try {
		const data = await Market.findOneAndUpdate(
			{ itemNo: itemNo },
			{ $set: ctx.request.body },
			{
				new: true,
			}
		).exec();
		if (!data) {
			ctx.status = 404;
			return;
		}
		ctx.body = data;
	} catch (e) {
		ctx.throw(500, e);
	}
};

export const calculate = async () => {
	const list = await Market.aggregate([
		{ $match: { material: { $ne: null } } },
		{ $unwind: '$material' },
		{
			$lookup: {
				from: 'Market',
				localField: 'material.itemName.value',
				foreignField: 'itemNo',
				let: {
					materialItemNo: '$Market.itemNo',
					itemCount: '$material.itemCount',
				},
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$material.itemNo', '$$materialItemNo'] },
						},
					},
					{ $addFields: { itemCount: '$$itemCount' } },
				],
				as: 'materialInfo',
			},
		},
		{ $unwind: '$materialInfo' },

		{
			$group: {
				_id: '$_id',
				itemNo: { $first: '$itemNo' },
				material: { $push: '$materialInfo' },
				charge: { $first: '$charge' },
				makeCount: { $first: '$makeCount' },
				lowPrice: { $first: '$lowPrice' },
			},
		},
	]);
	list.map((data) => {
		let makePrice = 0;
		data.material.map((item) => {
			let itemPrice = 0;
			if (item.count) {
				itemPrice = item.lowPrice / item.count;
			} else {
				itemPrice = item.lowPrice;
			}
			itemPrice *= item.itemCount;
			makePrice += itemPrice; //1회 제작 비용
		});
		const charge = data.charge; //제작 수수료
		const makeCount = data.makeCount; //1회 제작 갯수
		const lowPrice = data.lowPrice; //최저가
		const lowPriceUnder = lowPrice - 1; //최저가 -1
		const lowPriceUpper = lowPrice + 1; //최저가 +1

		const lowPriceMargin = itemCalc(makePrice, charge, makeCount, lowPrice);
		const lowPriceUnderMargin = itemCalc(
			makePrice,
			charge,
			makeCount,
			lowPriceUnder
		);
		const lowPriceUpperMargin = itemCalc(
			makePrice,
			charge,
			makeCount,
			lowPriceUpper
		);

		Market.findOneAndUpdate(
			{
				itemNo: data.itemNo,
			},
			{
				lowPriceMargin: lowPriceMargin,
				lowPriceUnderMargin: lowPriceUnderMargin,
				lowPriceUpperMargin: lowPriceUpperMargin,
			},
			{
				new: true,
			}
		).exec();
	});
};

const itemCalc = (makePrice, charge, makeCount, sellPrice) => {
	const totalPrice = makePrice + charge;
	const sellCharge =
		sellPrice === 1 ? 0 : Math.ceil(sellPrice * 0.05) * makeCount;
	return (sellPrice * makeCount - sellCharge - totalPrice).toFixed(3);
};
