import mongoose, { Schema } from 'mongoose';

const market = new Schema(
	{
		itemNo: Number,
		itemName: String,
		lowPrice: Number,
		sellPrice: Number,
		count: Number,
	},
	{ versionKey: false }
);

const Market = mongoose.model('Market', market, 'Market');
export default Market;
