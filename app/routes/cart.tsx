import {
	useLoaderData,
	Form,
	json,
	useActionData,
	redirect,
	useFetcher,
} from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { db } from "~/db/db.server";
import { cartItems } from "~/db/schema";
import { and, eq } from "drizzle-orm";
import { UserManager } from "~/utils/user.server";
import { useState, useEffect } from "react";
import { shipping, tax } from "~/config";

export const loader = async (args: any) => {
	const { userId }: any = await getAuth(args);

	const Items = await db.query.cartItems.findMany({
		where: eq(cartItems.userId, userId),
		with: {
			product: true,
		},
	});

	return { cartItems: Items };
};

export const action = async (args: any) => {
	const formData = await args.request.formData();
	const { userId }: any = await getAuth(args);

	try {
		const userManager = new UserManager(userId);
		const action = formData.get("action");

		switch (action) {
			case "update": {
				const quantity = parseInt(formData.get("quantity") as string);
				const productId = formData.get("productId") as string;
				const selectedDetails = JSON.parse(
					formData.get("selectedDetails") as string
				);

				// Validate quantity
				if (quantity <= 0) {
					return json({
						success: false,
						error: "Quantity must be greater than 0",
						field: "quantity",
						productId,
					});
				}

				await userManager.updateCart({ productId, quantity, selectedDetails });
				return json({ success: true, message: "Cart updated successfully" });
			}

			case "delete": {
				const productId = formData.get("productId") as string;
				const selectedDetails = JSON.parse(
					formData.get("selectedDetails") as string
				);
				console.log(selectedDetails);

				await userManager.removeCart({ productId, selectedDetails });
				return json({ success: true, message: "Item removed from cart" });
			}

			case "pay": {
				const url = await userManager.pay();
				return redirect(url);
			}
		}

		return json({ success: true });
	} catch (error: any) {
		console.error("Cart action error:", error);

		// Handle specific database constraint errors
		let errorMessage = "An error occurred while updating your cart";

		if (error.code === "23503") {
			errorMessage = "Product no longer exists";
		} else if (error.code === "23514") {
			errorMessage = "Invalid quantity value";
		} else if (error.message?.includes("insufficient")) {
			errorMessage = "Insufficient stock available";
		}

		return json({
			success: false,
			error: errorMessage,
			technical: error.message,
		});
	}
};

interface CartItem {
	userId: string;
	productId: string;
	quantity: number;
	selectedDetails: any;
	product: {
		id: string;
		name: string;
		price: string;
		quantity: number;
		quantityType: string;
		details: any[];
		images: string[];
	};
}

export default function Cart() {
	const { cartItems } = useLoaderData<typeof loader>();
	const actionData: any = useActionData();
	const fetcher = useFetcher();

	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [selectedItemDetails, setSelectedItemDetails] = useState<any>(null);
	const [itemQuantities, setItemQuantities] = useState<{
		[key: string]: number;
	}>({});

	// Initialize quantities and handle reverts on error
	useEffect(() => {
		const quantities: { [key: string]: number } = {};
		cartItems.forEach((item: CartItem) => {
			quantities[item.productId] = item.quantity;
		});
		setItemQuantities(quantities);
	}, [cartItems]);

	// Revert quantity on error
	useEffect(() => {
		if (actionData?.success === false && actionData?.productId) {
			const originalItem = cartItems.find(
				(item: CartItem) => item.productId === actionData.productId
			);
			if (originalItem) {
				setItemQuantities((prev) => ({
					...prev,
					[actionData.productId]: originalItem.quantity,
				}));
			}
		}
	}, [actionData, cartItems]);

	// Calculate totals
	const calculateItemTotal = (item: CartItem) => {
		return parseFloat(item.product.price) * item.quantity;
	};

	const calculateGrandTotal = () => {
		return cartItems.reduce((total: number, item: CartItem) => {
			return total + calculateItemTotal(item);
		}, 0);
	};

	const showItemDetails = (item: CartItem) => {
		setSelectedItemDetails(item);
		setShowDetailsModal(true);
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(price);
	};

	const formatSelectedDetails = (details: any) => {
		if (!details || Object.keys(details).length === 0) {
			return "No specific details selected";
		}

		return Object.entries(details)
			.map(([key, value]) => `${key}: ${value}`)
			.join(", ");
	};

	return (
		<div className="container mx-auto max-w-4xl my-8 px-4">
			<h1 className="text-3xl font-bold mb-6 text-gray-800">Shopping Cart</h1>

			<div className="bg-white rounded-lg shadow-lg overflow-hidden">
				{cartItems.length > 0 ? (
					<>
						{/* Cart Items */}
						<div className="divide-y divide-gray-200">
							{cartItems.map((item: any) => (
								<div
									key={`${item.userId}-${item.productId}`}
									className="p-6 hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-start gap-4">
												{/* Product Image */}
												{item.product.images.length > 0 && (
													<img
														src={item.product.images[0]}
														alt={item.product.name}
														className="w-16 h-16 object-cover rounded-lg"
													/>
												)}

												<div className="flex-1">
													<h3 className="text-lg font-semibold text-gray-900 mb-1">
														{item.product.name}
													</h3>

													<p className="text-sm text-gray-600 mb-2">
														Price: {formatPrice(parseFloat(item.product.price))}
													</p>

													<button
														onClick={() => showItemDetails(item)}
														className="text-sm text-blue-600 hover:text-blue-800 underline"
													>
														View selected details
													</button>

													{/* Stock info */}
													{item.product.quantityType === "limited" && (
														<p className="text-xs text-gray-500 mt-1">
															{item.product.quantity} available
														</p>
													)}
												</div>
											</div>
										</div>

										{/* Quantity and Actions */}
										<div className="flex items-center gap-4 ml-4">
											<div className="text-right">
												<p className="text-sm text-gray-600">
													Quantity: {item.quantity}
												</p>
												<p className="text-lg font-semibold text-gray-900">
													{formatPrice(calculateItemTotal(item))}
												</p>
											</div>

											<div className="flex flex-col gap-2">
												{/* Update Form */}
												<Form method="post" className="flex items-center gap-2">
													<input type="hidden" name="action" value="update" />

													<input
														type="hidden"
														name="productId"
														value={item.product.id}
													/>
													<input
														type="hidden"
														name="selectedDetails"
														value={JSON.stringify(item.selectedDetails)}
													/>
													<input
														type="number"
														name="quantity"
														// value={
														// 	itemQuantities[item.productId] || item.quantity
														// }
														defaultValue={item.quantity}
														max={
															item.product.quantityType === "limited"
																? item.product.quantity
																: undefined
														}
														min={1}
														className="border border-gray-300 rounded px-2 py-1 w-16 text-center"
													/>
													<button
														type="submit"
														disabled={fetcher.state === "submitting"}
														className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1 rounded text-sm transition-colors"
													>
														{fetcher.state === "submitting" ? "..." : "Update"}
													</button>
												</Form>

												{/* Remove Form */}
												<Form method="post">
													<input type="hidden" name="action" value="delete" />
													<input
														type="hidden"
														name="productId"
														value={item.product.id}
													/>
													<input
														type="hidden"
														name="selectedDetails"
														value={JSON.stringify(item.selectedDetails)}
													/>
													<button
														type="submit"
														disabled={fetcher.state === "submitting"}
														className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1 rounded text-sm transition-colors w-full"
													>
														Remove
													</button>
												</Form>
											</div>
										</div>
									</div>

									{/* Error message for this specific item */}
									{actionData?.success === false &&
										actionData?.productId === item.product.id && (
											<div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
												<p className="text-red-700 text-sm font-medium">
													{actionData.error}
												</p>
												{actionData.maxQuantity && (
													<p className="text-red-600 text-xs mt-1">
														Maximum available: {actionData.maxQuantity}
													</p>
												)}
											</div>
										)}
								</div>
							))}
						</div>

						{/* Cart Summary */}
						<div className="bg-gray-50 p-6 border-t">
							<div className="flex flex-col justify-between items-start mb-4">
								<span className="text-xl font-semibold text-gray-900">
									Total:{" "}
									{formatPrice(
										(calculateGrandTotal() + shipping) * (0.01 * tax + 1)
									)}
								</span>
								<span className="text-sm  text-gray-500">
									Shipping cost : {shipping}$
									<br /> Tax : {tax}%
								</span>
								<span className="text-sm text-gray-600">
									{cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
								</span>
							</div>

							<div className="flex flex-col sm:flex-row gap-3">
								<Form method="post" className="flex-1">
									<input type="hidden" name="action" value="pay" />
									<button
										type="submit"
										className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
									>
										Proceed to Payment
									</button>
								</Form>

								<a
									href="/user"
									target="_blank"
									className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-center transition-colors"
								>
									Update Shipping Address
								</a>
							</div>
						</div>
					</>
				) : (
					<div className="p-12 text-center">
						<div className="max-w-md mx-auto">
							<div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
								<svg
									className="w-8 h-8 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H18M9 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM20.5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
									/>
								</svg>
							</div>
							<h2 className="text-xl font-semibold text-gray-900 mb-2">
								Your cart is empty
							</h2>
							<p className="text-gray-600 mb-4">
								Add some products to get started
							</p>
							<a
								href="/products"
								className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
							>
								Continue Shopping
							</a>
						</div>
					</div>
				)}
			</div>

			{/* Success/Error Messages */}
			{actionData?.success && (
				<div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
					<p className="text-green-700 font-medium">
						{actionData.message || "Operation completed successfully"}
					</p>
				</div>
			)}

			{actionData?.success === false && !actionData?.cartItemKey && (
				<div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-red-700 font-medium">{actionData.error}</p>
					{actionData.technical && (
						<details className="mt-2">
							<summary className="text-red-600 text-sm cursor-pointer">
								Technical details
							</summary>
							<p className="text-red-600 text-xs mt-1 font-mono">
								{actionData.technical}
							</p>
						</details>
					)}
				</div>
			)}

			{/* Details Modal */}
			{showDetailsModal && selectedItemDetails && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-start mb-4">
								<h3 className="text-xl font-semibold text-gray-900">
									Product Details
								</h3>
								<button
									onClick={() => setShowDetailsModal(false)}
									className="text-gray-400 hover:text-gray-600 text-2xl"
								>
									×
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">
										{selectedItemDetails.product.name}
									</h4>
									<p className="text-gray-600">
										Price:{" "}
										{formatPrice(parseFloat(selectedItemDetails.product.price))}
									</p>
									<p className="text-gray-600">
										Quantity: {selectedItemDetails.quantity}
									</p>
								</div>

								{selectedItemDetails.product.images.length > 0 && (
									<div>
										<h5 className="font-medium text-gray-900 mb-2">Images</h5>
										<div className="grid grid-cols-2 gap-2">
											{selectedItemDetails.product.images.map(
												(image: string, index: number) => (
													<img
														key={index}
														src={image}
														alt={`${selectedItemDetails.product.name} ${
															index + 1
														}`}
														className="w-full h-24 object-cover rounded"
													/>
												)
											)}
										</div>
									</div>
								)}

								<div>
									<h5 className="font-medium text-gray-900 mb-2">
										Selected Options
									</h5>
									<p className="text-gray-600 text-sm">
										{formatSelectedDetails(selectedItemDetails.selectedDetails)}
									</p>
								</div>

								{selectedItemDetails.product.details.length > 0 && (
									<div>
										<h5 className="font-medium text-gray-900 mb-2">
											Available Options
										</h5>
										<div className="space-y-2">
											{selectedItemDetails.product.details.map(
												(detail: any, index: number) => (
													<div key={index} className="text-sm text-gray-600">
														{JSON.stringify(detail)}
													</div>
												)
											)}
										</div>
									</div>
								)}
							</div>

							<div className="mt-6 flex justify-end">
								<button
									onClick={() => setShowDetailsModal(false)}
									className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
