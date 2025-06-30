import { and, eq, sql, sum } from "drizzle-orm";
import { db } from "~/db/db.server";
import { cartItems, products, users } from "~/db/schema";
import { LemonsqueezyClient } from "lemonsqueezy.ts";
import { domain, shipping, tax, title } from "~/config";

export class UserManager {
	private userId: any;

	constructor(userId: string) {
		this.userId = userId;
	}

	async addCart({
		productId,
		quantity = 1,
		selectedDetails = {},
	}: {
		productId: string;
		quantity?: number;
		selectedDetails?: Record<string, any>;
	}) {
		const user = await db.query.users.findFirst({
			where: eq(users.id, this.userId),
		});

		if (!user) {
			throw new Error("User does not exist.");
		}

		const [inCart] = await db
			.insert(cartItems)
			.values({
				userId: this.userId,
				productId,
				quantity,
				selectedDetails,
			})
			.onConflictDoUpdate({
				target: [
					cartItems.userId,
					cartItems.productId,
					cartItems.selectedDetails,
				],
				set: {
					quantity: sql`${cartItems.quantity} + ${quantity}`,
					updatedAt: sql`now()`,
				},
			})
			.returning({ quantity: cartItems.quantity });

		return inCart.quantity;
	}
	async updateData({ number, address }: any): Promise<void> {
		await db
			.update(users)
			.set({ number, address })
			.where(eq(users.id, this.userId));
	}

	async removeCart({ productId, selectedDetails }: any) {
		await db
			.delete(cartItems)
			.where(
				and(
					eq(this.userId, cartItems.userId),
					eq(productId, cartItems.productId),
					eq(cartItems.selectedDetails, selectedDetails)
				)
			);
	}

	async updateCart({ productId, quantity, selectedDetails }: any) {
		await db
			.update(cartItems)
			.set({ quantity })
			.where(
				and(
					eq(this.userId, cartItems.userId),
					eq(productId, cartItems.productId),
					eq(cartItems.selectedDetails, selectedDetails)
				)
			);
	}

	async pay() {
		const separator =
			"\n\n______________________________________________________________________________________________________\n\n";
		const items: any = await db.query.cartItems.findMany({
			where: eq(cartItems.userId, this.userId),
			with: {
				product: true,
			},
		});
		const total = items.reduce((total: any, item: any) => {
			return total + item.product.price * item.quantity;
		}, 0);
		const client = new LemonsqueezyClient(process.env.LEMON_API!);
		// let cartArr = JSON.stringify(items).match(/.{1,255}/g) || [];
		const checkout: any = await client.createCheckout({
			checkout_options: {
				button_color: "#2DD272",
			},
			product_options: {
				redirect_url: `${domain}/orders`,
				name: title,
				description: `your items : ${separator} ${items
					.map((item: any) => {
						return `${item.product.name} (x ${item.quantity}) price: ${
							item.quantity * item.product.price
						} $`;
					})
					.join(
						separator
					)} ${separator} [${shipping}$ shipping fee + ${shipping}% tax ]`,
			},
			checkout_data: {
				custom: {
					id: this.userId,
				},
			},
			expires_at: new Date(Date.now() + 5 * 60 * 1000),
			custom_price: (total + shipping) * (100 + tax),
			store: "59035",
			variant: "558027",
		});
		return checkout.data.attributes.url;
	}
}
