import { A } from "@solidjs/router";

const About = () => {
	return (
		<article
			style={{
				position: "fixed",
				top: "16px",
				left: "16px",
				"z-index": 1,
			}}
		>
			<p>ラブライブ！シリーズの聖地情報をまとめたマップです。</p>
			<A href="/register">
				<button type="button">聖地を登録する</button>
			</A>
		</article>
	);
};

export default About;
