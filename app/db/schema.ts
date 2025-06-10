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
} from "drizzle-orm/pg-core";

// Users table (to store additional user info beyond Clerk)
export const users = pgTable("users", {
	id: text("id").primaryKey(),
	number: text("number"),
	address: text("address"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table
export const products = pgTable("products", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	price: decimal("price", { precision: 10, scale: 2 }).notNull(),
	quantity: integer("quantity").notNull().default(0),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Orders table
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
	status: varchar("status").notNull().default("جاري التحقق"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cart items table
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
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.userId, table.productId] }),
		};
	}
);

// Define relations
export const productsRelations = relations(products, ({ many }) => ({
	cartItems: many(cartItems),
	orders: many(orders),
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
