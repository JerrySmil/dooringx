import { IBlockType } from '../core/store/storetype';
import { CSSProperties, PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { innerDrag } from '../core/innerDrag';
import { BlockResizer } from '../core/resizeHandler';
import { contextMenuEvent } from '../core/contextMenu';
import React from 'react';
import { transfer } from '../core/transfer';
import { UserConfig } from '../config';
import styles from '../index.less';
import { RotateResizer } from '../core/rotateHandler';
interface BlockProps {
	data: IBlockType;
	context: 'edit' | 'preview';
	config: UserConfig;
	iframe?: boolean;
}

/**
 * block在modal中也要使用，所以该组件不应该接收容器ref
 * 用来从component里拿到渲染进行渲染,由于异步拉代码，所以需要等待代码拉取完毕
 * @param {*} props
 * @returns
 */
function Blocks(props: PropsWithChildren<BlockProps>) {
	const [state, setState] = useState<JSX.Element | null>(null);

	const [previewState, setPreviewState] = useState({
		top: props.data.top,
		left: props.data.left,
		height: props.data.height,
		width: props.data.width,
	});

	useEffect(() => {
		const fn = () => props.config.getComponentRegister().getComp(props.data.name);
		const data = fn();
		let unregist = () => {};
		let newdata = { ...props.data };
		if (props.context === 'preview') {
			newdata = {
				...props.data,
				top: previewState.top,
				left: previewState.left,
				height: previewState.height,
				width: previewState.width,
			};
		}

		if (data) {
			setState(data.render(newdata, props.context, props.config.getStore(), props.config));
		} else {
			const callback = () => {
				const tmp = fn();
				setState(tmp.render(newdata, props.context, props.config.getStore(), props.config));
				unregist();
			};
			unregist = props.config.getComponentRegister().on(props.data.name, callback);
		}
		return () => {
			unregist();
		};
	}, [props.data, props.context, props.config, previewState]);

	const ref = useRef<HTMLDivElement>(null);
	const innerDragData = useMemo(() => {
		return { ...innerDrag(props.data, ref, props.config) };
	}, [props.data, props.config]);

	useEffect(() => {
		const fn = () => {
			const { top, left, width, height } = transfer(
				props.data.top,
				props.data.left,
				props.data.height,
				props.data.width,
				props.data.fixed,
				props.data.rotate.value
			);

			setPreviewState({ top, left, width, height });
		};
		fn();
		window.addEventListener('resize', fn);
		return () => {
			window.removeEventListener('resize', fn);
		};
	}, [
		previewState.height,
		previewState.left,
		previewState.top,
		previewState.width,
		props.data.height,
		props.data.left,
		props.data.top,
		props.data.width,
		props.data.fixed,
		props.data.rotate,
	]);

	const animatecss = useMemo(() => {
		const animate = props.data.animate;
		if (Object.keys(animate).length > 0) {
			return `animate__animated ${animate.animate ?? ''} ${animate.delay ?? ''}  ${
				animate.speed ?? ''
			}`;
		}
		return '';
	}, [props.data.animate]);
	const animateCount = useMemo(() => {
		const animate = props.data.animate;
		if (Object.keys(animate).length > 0) {
			return { animationIterationCount: animate.animationIterationCount };
		}
		return { animationIterationCount: '' };
	}, [props.data.animate]);

	const render = useMemo(() => {
		// 如果是编辑模式下，则需要包裹不能选中层，位移层，缩放控制层，平面移动层。
		if (state && props.context === 'edit') {
			const style: CSSProperties = props.data.canDrag ? { pointerEvents: 'none' } : {};
			return (
				<div
					ref={ref}
					className={
						props.data.focus && props.data.position !== 'static' ? styles.yh_block_focus : ''
					}
					style={{
						position: props.data.position,
						top: props.data.top,
						left: props.data.left,
						width: props.data.width,
						height: props.data.height,
						zIndex: props.data.zIndex,
						display: props.data.display,
						opacity: props.iframe ? 0 : 1,
						transform: `rotate(${props.data.rotate.value}deg)`,
					}}
					{...innerDragData}
					onContextMenu={(e) => {
						if (props.data.name !== 'modalMask') {
							contextMenuEvent(e, ref, props.config);
						}
					}}
				>
					{/* 绝对定位元素 */}
					{props.data.position !== 'static' && (
						<div className={animatecss} style={{ ...style, ...animateCount }}>
							{state}
						</div>
					)}
					{/* 静态定位 非行内 这里暂不考虑布局影响 */}
					{props.data.position === 'static' && props.data.display !== 'inline' && (
						<div
							className={animatecss}
							style={{
								pointerEvents: 'none',
								width: '100%',
								height: '100%',
								...animateCount,
							}}
						>
							{state}
						</div>
					)}
					{/* 静态定位 行内 这里暂不考虑布局影响 */}
					{props.data.position === 'static' && props.data.display === 'inline' && (
						<span style={{ pointerEvents: 'none' }}>{state}</span>
					)}
					<BlockResizer data={props.data} config={props.config} rect={ref}></BlockResizer>
					<RotateResizer data={props.data} config={props.config} rect={ref}></RotateResizer>
				</div>
			);
		} else {
			return (
				<div
					className={animatecss}
					style={{
						position: props.data.fixed ? 'fixed' : props.data.position,
						top: previewState.top,
						left: previewState.left,
						width: previewState.width,
						height: previewState.height,
						zIndex: props.data.zIndex,
						display: props.data.display,
						transform: `rotate(${props.data.rotate}deg)`,
						...animateCount,
					}}
				>
					{state}
				</div>
			);
		}
	}, [
		state,
		props.context,
		props.data,
		props.iframe,
		props.config,
		innerDragData,
		animatecss,
		animateCount,
		previewState.top,
		previewState.left,
		previewState.width,
		previewState.height,
	]);
	return render;
}
export default Blocks;
