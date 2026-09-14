import { A } from "@solidjs/router";
import "./About.css";
import { Plus } from "lucide-solid/icons";

const About = () => {
	return (
		<article class="about-panel">
			<p>ラブライブ！シリーズの聖地情報をまとめたマップです。</p>
			<A href="/register">
				<button type="button">
					<Plus /> 聖地を登録する
				</button>
			</A>
		</article>
	);
};

export default About;
