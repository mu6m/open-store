export const loader = () => {
	const robotText = `User-Agent: *\nAllow: /`;

	return new Response(robotText, {
		status: 200,
		headers: {
			"Content-Type": "text/plain",
		},
	});
};
