import { db } from "~/db/db.server";
import { categories, products } from "~/db/schema";
import { sql } from "drizzle-orm";
import { eq, or, desc } from "drizzle-orm";

export const ITEMS_PER_PAGE = 12;

export async function getProducts(page: number, searchQuery?: string) {
	const offset = (page - 1) * ITEMS_PER_PAGE;

	let query: any = db
		.select({
			id: products.id,
			name: products.name,
			description: products.description,
			price: products.price,
			quantity: products.quantity,
			quantityType: products.quantityType,
			categoryId: products.categoryId,
			images: products.images,
			info: products.info,
			details: products.details,
			createdAt: products.createdAt,
			updatedAt: products.updatedAt,
			category: {
				id: categories.id,
				name: categories.name,
				description: categories.description,
			},
		})
		.from(products)
		.leftJoin(categories, eq(products.categoryId, categories.id));

	if (searchQuery) {
		query = query.where(
			or(
				sql`${products.name} ILIKE ${`%${searchQuery}%`}`,
				sql`${products.description} ILIKE ${`%${searchQuery}%`}`,
				sql`${categories.name} ILIKE ${`%${searchQuery}%`}`
			)
		);
	}

	const totalItems = await db
		.select({ count: sql<number>`count(*)` })
		.from(products)
		.leftJoin(categories, eq(products.categoryId, categories.id))
		.where(
			searchQuery
				? or(
						sql`${products.name} ILIKE ${`%${searchQuery}%`}`,
						sql`${products.description} ILIKE ${`%${searchQuery}%`}`,
						sql`${categories.name} ILIKE ${`%${searchQuery}%`}`
				  )
				: undefined
		)
		.then((result: any) => Number(result[0].count));

	const productList = await query
		.limit(ITEMS_PER_PAGE)
		.offset(offset)
		.orderBy(desc(products.createdAt));

	return {
		products: productList,
		totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
		currentPage: page,
	};
}
