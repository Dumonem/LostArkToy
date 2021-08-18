import mongoose, { Schema } from 'mongoose';

const market = new Schema(
	{
		itemNo: Number,
		itemName: String,
		lowPrice: Number,
		sellPrice: Number,
		count: Number,
		category: Number,
		material: [
			{
				itemName: {
					label: String,
					value: Number,
				},
				itemCount: Number,
			},
		],
		charge: Number,
		makeCount: Number,
		lowPriceMargin: Number,
		lowPriceUnderMargin: Number,
		lowPriceUpperMargin: Number,
	},
	{ versionKey: false }
);

export default mongoose.model('Market', market, 'Market');
