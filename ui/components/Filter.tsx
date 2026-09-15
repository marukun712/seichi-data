import { Search, X } from "lucide-solid";
import { createSignal, For } from "solid-js";
import type { Series } from "../../src/schema.ts";
import "./Filter.css";

interface Props {
	series: Series[];
	selectedSeries: string[];
	tags: string[];
	selectedTags: string[];
	onSeriesToggle: (id: string) => void;
	onSeriesClear: () => void;
	onTagToggle: (tag: string) => void;
}

const Filter = (props: Props) => {
	const [open, setOpen] = createSignal(false);

	return (
		<>
			<button
				type="button"
				class="filter-trigger"
				onClick={() => setOpen(true)}
			>
				<Search /> フィルターを開く
			</button>
			<dialog open={open()}>
				<article class="filter-panel">
					<header>
						<button
							type="button"
							aria-label="閉じる"
							onClick={() => setOpen(false)}
						>
							<X />
						</button>
					</header>
					<button
						type="button"
						classList={{
							"filter-inactive": props.selectedSeries.length !== 0,
						}}
						onClick={props.onSeriesClear}
					>
						すべて
					</button>
					<div class="filter-chip-list">
						<For each={props.series}>
							{(s) => {
								const isActive = () => props.selectedSeries.includes(s.id);
								return (
									<button
										type="button"
										classList={{
											"filter-series-active": isActive(),
											"filter-inactive": !isActive(),
										}}
										style={
											isActive() ? { "--series-color": s.color } : undefined
										}
										onClick={() => props.onSeriesToggle(s.id)}
									>
										{s.name}
									</button>
								);
							}}
						</For>
					</div>
					<div class="filter-chip-list">
						<For each={props.tags}>
							{(tag) => (
								<label>
									<input
										type="checkbox"
										checked={props.selectedTags.includes(tag)}
										onChange={() => props.onTagToggle(tag)}
									/>
									{tag}
								</label>
							)}
						</For>
					</div>
				</article>
			</dialog>
		</>
	);
};

export default Filter;
