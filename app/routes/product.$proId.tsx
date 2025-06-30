import { getAuth } from "@clerk/remix/ssr.server";
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type MetaFunction,
} from "@remix-run/node";
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from "@remix-run/react";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { useEffect, useState } from "react";
import { db } from "~/db/db.server";
import { products } from "~/db/schema";
import { UserManager } from "~/utils/user.server";
import { title } from "~/config";

// Zod schema for dynamic validation
const createDetailsSchema = (details: any[]) => {
	const schemaFields: any = {};

	details.forEach((detail, index) => {
		const fieldName = `detail_${index}`;

		switch (detail.type) {
			case "select":
				if (detail.required) {
					schemaFields[fieldName] = z.enum(
						detail.options as [string, ...string[]],
						{
							required_error: `${detail.label} is required`,
						}
					);
				} else {
					schemaFields[fieldName] = z
						.enum(detail.options as [string, ...string[]])
						.optional();
				}
				break;
			case "checkbox":
				schemaFields[fieldName] = z.array(z.string()).optional();
				break;
			case "text":
				if (detail.required) {
					schemaFields[fieldName] = z
						.string()
						.min(1, `${detail.label} is required`);
				} else {
					schemaFields[fieldName] = z.string().optional();
				}
				break;
		}
	});

	return z.object({
		productId: z.string(),
		quantity: z.number().min(1),
		...schemaFields,
	});
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (!data) {
		return [
			{ title: "Product Not Found" },
			{
				name: "description",
				content: "The requested product could not be found.",
			},
		];
	}

	const product = data as any;

	return [
		{ title: `${product.name} - ${title}` },
		{
			name: "description",
			content:
				product.description ||
				`Buy ${product.name} for $${Number(product.price).toFixed(2)}`,
		},
		{
			name: "keywords",
			content: `${product.name}, ${
				product.category?.name || "products"
			}, shop, buy online`,
		},
		{ property: "og:title", content: product.name },
		{
			property: "og:description",
			content:
				product.description ||
				`Buy ${product.name} for $${Number(product.price).toFixed(2)}`,
		},
		{
			property: "og:image",
			content: product.images[0] || "/placeholder-image.jpg",
		},
		{ property: "og:type", content: "product" },
		{
			property: "product:price:amount",
			content: Number(product.price).toFixed(2),
		},
		{ property: "product:price:currency", content: "USD" },
	];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	const proId = params.proId;

	if (!proId) {
		throw new Response("Product code not provided", { status: 404 });
	}

	const product = await db.query.products.findFirst({
		where: eq(products.id, proId),
		with: {
			category: true,
		},
	});

	if (!product) {
		throw new Response("Product not found", { status: 404 });
	}

	// Add the request URL for JSON-LD
	const url = new URL(request.url);

	return json({ ...product, baseUrl: `${url.protocol}//${url.host}` });
}

export async function action(args: ActionFunctionArgs) {
	const formData = await args.request.formData();
	const { userId }: any = await getAuth(args);

	if (!userId) {
		return json({ success: false, error: "Please login to your account" });
	}

	try {
		const productId = formData.get("productId") as string;
		const quantity = parseInt(formData.get("quantity") as string) || 1;

		// Get product to validate details
		const product = await db.query.products.findFirst({
			where: eq(products.id, productId),
		});

		if (!product) {
			return json({ success: false, error: "Product not found" });
		}

		// Create dynamic schema based on product details
		const detailsSchema = createDetailsSchema(product.details as any[]);

		// Extract form data
		const formDataObj: any = {
			productId,
			quantity,
		};

		// Extract detail fields
		(product.details as any[]).forEach((detail, index) => {
			const fieldName = `detail_${index}`;
			if (detail.type === "checkbox") {
				formDataObj[fieldName] = formData.getAll(fieldName);
			} else {
				formDataObj[fieldName] = formData.get(fieldName);
			}
		});

		// Validate with Zod
		const validatedData = detailsSchema.parse(formDataObj);

		// Format selected details for storage
		const selectedDetails: any = {};
		(product.details as any[]).forEach((detail, index) => {
			const fieldName = `detail_${index}`;
			const value = validatedData[fieldName];
			if (value !== undefined && value !== null && value !== "") {
				selectedDetails[detail.label] = value;
			}
		});

		const userManager = new UserManager(userId);
		const inCart = await userManager.addCart({
			productId,
			userId,
			quantity,
			selectedDetails,
		});

		return json({ success: `Added! There are ${inCart} in cart` });
	} catch (error: any) {
		console.log(error);

		if (error instanceof z.ZodError) {
			const firstError = error.errors[0];
			return json({
				success: false,
				error: firstError.message,
			});
		}

		if (
			error.code === "P0001" &&
			error.message.includes("Not enough stock for product")
		) {
			return json({
				success: false,
				error: "Maximum quantity reached",
			});
		}

		return json({ success: false, error: "Error during cart update" });
	}
}

// Image Slider Component
function ImageSlider({
	images,
	productName,
}: {
	images: string[];
	productName: string;
}) {
	const [currentIndex, setCurrentIndex] = useState(0);

	const nextSlide = () => {
		setCurrentIndex((prev) => (prev + 1) % images.length);
	};

	const prevSlide = () => {
		setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
	};

	const goToSlide = (index: number) => {
		setCurrentIndex(index);
	};

	useEffect(() => {
		if (images.length <= 1) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % images.length);
		}, 5000);

		return () => clearInterval(interval);
	}, [images.length]);

	if (images.length === 0) {
		return (
			<div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
				<div className="text-center text-gray-400">
					<svg
						className="w-16 h-16 mx-auto mb-2"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
							clipRule="evenodd"
						/>
					</svg>
					<p className="text-sm">No image available</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50 group">
			{/* Main Image */}
			<div className="relative w-full h-full">
				{images.map((image, index) => (
					<div
						key={index}
						className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
							index === currentIndex ? "opacity-100" : "opacity-0"
						}`}
					>
						<img
							src={image}
							alt={`${productName} - Image ${index + 1}`}
							className="w-full h-full object-cover"
						/>
					</div>
				))}
			</div>

			{images.length > 1 && (
				<>
					{/* Navigation Arrows */}
					<button
						type="button"
						onClick={prevSlide}
						className="absolute top-0 left-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group/btn focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm group-hover/btn:bg-white/50 group-focus/btn:ring-4 group-focus/btn:ring-white/70 group-focus/btn:outline-none transition-all">
							<svg
								className="w-4 h-4 text-gray-800"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 6 10"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M5 1 1 5l4 4"
								/>
							</svg>
							<span className="sr-only">Previous</span>
						</span>
					</button>

					<button
						type="button"
						onClick={nextSlide}
						className="absolute top-0 right-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group/btn focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm group-hover/btn:bg-white/50 group-focus/btn:ring-4 group-focus/btn:ring-white/70 group-focus/btn:outline-none transition-all">
							<svg
								className="w-4 h-4 text-gray-800"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 6 10"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="m1 9 4-4-4-4"
								/>
							</svg>
							<span className="sr-only">Next</span>
						</span>
					</button>

					{/* Dots Indicators */}
					<div className="absolute z-30 flex space-x-3 -translate-x-1/2 bottom-5 left-1/2">
						{images.map((_, index) => (
							<button
								key={index}
								type="button"
								onClick={() => goToSlide(index)}
								className={`w-3 h-3 rounded-full transition-all ${
									index === currentIndex
										? "bg-white"
										: "bg-white/50 hover:bg-white/70"
								}`}
								aria-current={index === currentIndex}
								aria-label={`Slide ${index + 1}`}
							/>
						))}
					</div>

					{/* Image Counter */}
					<div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
						{currentIndex + 1} / {images.length}
					</div>
				</>
			)}
		</div>
	);
}

export default function ProductPage() {
	const product: any = useLoaderData<typeof loader>();
	const actionData: any = useActionData();
	const navigation: any = useNavigation();

	// JSON-LD structured data for SEO
	const jsonLd = {
		"@context": "https://schema.org/",
		"@type": "Product",
		name: product.name,
		description: product.description || "",
		image: product.images,
		brand: {
			"@type": "Brand",
			name: "Your Store",
		},
		category: product.category?.name || "",
		offers: {
			"@type": "Offer",
			url: `${product.baseUrl}/product/${product.id}`,
			priceCurrency: "USD",
			price: Number(product.price).toFixed(2),
			availability:
				product.quantity > 0 || product.quantityType === "unlimited"
					? "https://schema.org/InStock"
					: "https://schema.org/OutOfStock",
			seller: {
				"@type": "Organization",
				name: "Your Store",
			},
		},
	};

	const renderDetailField = (detail: any, index: number) => {
		const fieldName = `detail_${index}`;

		switch (detail.type) {
			case "select":
				return (
					<div key={index} className="space-y-2">
						<label className="text-sm font-medium text-gray-900">
							{detail.label}
							{detail.required && <span className="text-red-500 ml-1">*</span>}
						</label>
						<select
							name={fieldName}
							required={detail.required}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">Choose {detail.label}</option>
							{detail.options.map((option: string) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>
				);

			case "checkbox":
				return (
					<div key={index} className="space-y-2">
						<label className="text-sm font-medium text-gray-900">
							{detail.label}
						</label>
						<div className="space-y-2">
							{detail.options.map((option: string) => (
								<label key={option} className="flex items-center">
									<input
										type="checkbox"
										name={fieldName}
										value={option}
										className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
									<span className="ml-2 text-sm text-gray-700">{option}</span>
								</label>
							))}
						</div>
					</div>
				);

			case "text":
				return (
					<div key={index} className="space-y-2">
						<label className="text-sm font-medium text-gray-900">
							{detail.label}
							{detail.required && <span className="text-red-500 ml-1">*</span>}
						</label>
						<textarea
							name={fieldName}
							required={detail.required}
							rows={3}
							placeholder={`Enter ${detail.label.toLowerCase()}...`}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<>
			{/* JSON-LD Script */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			<div className="max-w-6xl mx-auto px-4 py-8">
				<div className="grid lg:grid-cols-2 gap-8">
					{/* Image Section */}
					<div className="space-y-4">
						<ImageSlider images={product.images} productName={product.name} />
					</div>

					{/* Product Details Section */}
					<div className="space-y-6">
						{/* Category & Title */}
						<div>
							{product.category && (
								<span className="text-sm text-blue-600 font-medium">
									{product.category.name}
								</span>
							)}
							<h1 className="text-3xl font-bold text-gray-900 mt-1">
								{product.name}
							</h1>
						</div>

						{/* Price */}
						<div className="text-xl text-gray-900">
							${Number(product.price).toFixed(2)}
						</div>

						{/* Description */}
						{product.description && (
							<p className="text-gray-600 leading-relaxed">
								{product.description}
							</p>
						)}

						{/* Product Info */}
						{product.info && product.info.trim() && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<p className="text-blue-800 text-sm whitespace-pre-line">
									{product.info}
								</p>
							</div>
						)}

						{/* Stock Status */}
						<div className="flex items-center text-sm">
							{product.quantityType === "unlimited" ? (
								<span className="text-green-600 font-medium">✓ In Stock</span>
							) : product.quantity > 0 ? (
								<span className="text-green-600 font-medium">
									✓ {product.quantity} in stock
								</span>
							) : (
								<span className="text-red-600 font-medium">✗ Out of stock</span>
							)}
						</div>

						{/* Add to Cart Form */}
						<Form method="post" className="space-y-6">
							<input type="hidden" name="productId" value={product.id} />

							{/* Quantity */}
							<div className="flex gap-2 items-center">
								<label className="text-sm font-medium text-gray-900">
									Quantity
								</label>
								<input
									type="number"
									name="quantity"
									min="1"
									max={
										product.quantityType === "limited"
											? product.quantity
											: undefined
									}
									defaultValue="1"
									className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							{/* Dynamic Details Fields */}
							{product.details &&
								Array.isArray(product.details) &&
								product.details.length > 0 && (
									<div className="space-y-4">
										{product.details.map((detail: any, index: number) =>
											renderDetailField(detail, index)
										)}
									</div>
								)}

							{/* Add to Cart Button */}
							<button
								disabled={
									navigation.state === "submitting" ||
									(product.quantityType === "limited" && product.quantity === 0)
								}
								type="submit"
								className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{navigation.state === "submitting" ? (
									<span className="flex items-center justify-center">
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
												fill="none"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Adding to Cart...
									</span>
								) : (
									"Add to Cart"
								)}
							</button>

							{/* Messages */}
							{actionData?.success && (
								<div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
									{actionData.success}
								</div>
							)}

							{actionData?.error && (
								<div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
									{actionData.error}
								</div>
							)}
						</Form>
					</div>
				</div>
			</div>
		</>
	);
}
