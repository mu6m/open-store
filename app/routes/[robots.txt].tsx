import { domain } from "~/config";

export const loader = () => {
	const robotText = `User-Agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml`;

	return new Response(robotText, {
		status: 200,
		headers: {
			"Content-Type": "text/plain",
		},
	});
};
