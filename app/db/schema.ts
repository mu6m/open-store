import { relations, sql } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
	integer,
	decimal,
	primaryKey,
	jsonb,
	pgEnum,
} from "drizzle-orm/pg-core";

export const quantityTypeEnum = pgEnum("quantity_type", [
	"limited",
	"unlimited",
]);

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	number: text("number"),
	address: text("address"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	price: decimal("price", { precision: 10, scale: 2 }).notNull(),
	quantity: integer("quantity").notNull().default(0),
	quantityType: quantityTypeEnum("quantity_type").notNull().default("limited"),
	categoryId: uuid("category_id").references(() => categories.id),
	images: jsonb("images").notNull().default("[]"),
	info: text("info").notNull().default(""),
	details: jsonb("details").notNull().default("[]"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	productId: uuid("product_id")
		.notNull()
		.references(() => products.id),
	quantity: integer("quantity").notNull(),
	price: decimal("price", { precision: 10, scale: 2 }).notNull(),
	status: varchar("status").notNull().default("checking order"),
	selectedDetails: jsonb("selected_details").notNull().default("{}"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable(
	"cart_items",
	{
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id),
		quantity: integer("quantity").notNull().default(1),
		selectedDetails: jsonb("selected_details").notNull().default("{}"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({
				columns: [table.userId, table.productId, table.selectedDetails],
			}),
		};
	}
);

export const categoriesRelations = relations(categories, ({ many }) => ({
	products: many(products),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
	cartItems: many(cartItems),
	orders: many(orders),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id],
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	carts: many(cartItems),
	orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id],
	}),
	product: one(products, {
		fields: [orders.productId],
		references: [products.id],
	}),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
	user: one(users, {
		fields: [cartItems.userId],
		references: [users.id],
	}),
	product: one(products, {
		fields: [cartItems.productId],
		references: [products.id],
	}),
}));
