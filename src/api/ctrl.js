import axios from 'axios';
import * as cheerio from 'cheerio';
import Market from '../models/market';

export const getMarketList = async () => {
	try {
		let page = 1;
		let maxPage = 99;
		do {
			let res = await axios.get(
				'https://lostark.game.onstove.com/Market/List_v2?firstCategory=90000&itemName=&pageNo=' +
					page +
					'&isInit=false&sortType=7'
			);
			addData(res);
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
			addData(res);
			page++;
		} while (page <= maxPage);
		let res = await axios.get(
			'https://lostark.game.onstove.com/Market/List_v2?firstCategory=50000&itemName=%EC%98%A4%EB%A0%88%ED%95%98&pageNo=&isInit=false&sortType=7'
		);
		addData(res);
	} catch (e) {
		console.error(e);
	}
};

const addData = (res) => {
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
				itemName: itemName,
				lowPrice: lowPrice,
				sellPrice: sellPrice,
				count: count,
			},
			{},
			{
				new: true,
				upsert: true,
			}
		);
	});
};
