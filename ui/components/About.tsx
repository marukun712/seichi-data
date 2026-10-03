import { A } from "@solidjs/router";
import { Plus, Search } from "lucide-solid/icons";
import "./About.css";

interface Props {
	resultCount: number;
	onOpenFilter: () => void;
}

const About = (props: Props) => {
	return (
		<article class="about-panel">
			<img
				class="about-logo"
				src="https://www.lovelive-academy.com/_next/image?url=%2Fofficial_icon.webp&w=48&q=75"
				alt="Official Icon"
			/>
			<div class="action-row">
				<A href="/register">
					<button type="button" class="square-button">
						<Plus />
						<span>追加</span>
					</button>
				</A>
				<button
					type="button"
					class="square-button"
					onClick={props.onOpenFilter}
				>
					<Search />
					<span>絞り込み</span>
				</button>
			</div>
		</article>
	);
};

export default About;
