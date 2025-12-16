/**
 * 放映模式
 * 支持：画布绘图、全屏控制、缩放、TOC目录、适配图像懒加载等
 */
$(document).ready(function() {
    // ====================== 全局配置 ======================
    const CONFIG = {
        BRUSH_SIZE_STEPS: [1, 5, 8, 12, 20, 30],    // 画笔尺寸可选值
        ZOOM: { min: 0.5, max: 2.0, step: 0.1 },    // 缩放最小比例/最大比例/调整步长
        DEFAULT_BRUSH_COLOR: '#ff0000',             // 默认画笔颜色
        DEFAULT_BRUSH_SIZE_INDEX: 1,                // 默认画笔尺寸索引
        TITLE_SELECTORS: 'h1, h2, h3, h4, h5'       // TOC匹配的标题标签
    };

    // ====================== DOM节点 ======================
    // 基础节点
    const $document = $(document);  // 文档根节点
    const $window = $(window);      // 窗口对象
    const $body = $('body');        // body节点

    // 放映模式核心容器节点
    const $main = $('.playback #playbackMain');                 // 放映模式主容器
    const $playbackContent = $('.playback #playbackContent');   // 放映模式内容容器
    const $toolbar = $('.playback #playbackToolbar');           // 放映模式工具栏
    let $originalContent = $('.post-content');                  // 原始文章内容容器

    // 画布节点
    const $canvas = $('.playback #playbackDrawingCanvas');  // 绘图画布
    const canvas = $canvas[0];                              // 画布原生DOM对象
    let ctx = null;                                  // 画布2D上下文对象

    // 画笔/橡皮擦控件节点
    const $brushSizeControls = $('.playback #brushSizeControls');       // 画笔尺寸控制容器
    const $sizePrev = $('.playback .brush-size-controls .size-prev');   // 画笔颜色预览块
    const $disableDrawBtn = $('.playback #disableDrawBtn');             // 禁用绘图按钮
    const $drawBtn = $('.playback #drawBtn');                           // 画笔模式按钮
    const $eraserBtn = $('.playback #eraserBtn');                       // 橡皮擦模式按钮
    const $sizeDownBtn = $('.playback #sizeDownBtn');                   // 画笔尺寸减小按钮
    const $sizeUpBtn = $('.playback #sizeUpBtn');                       // 画笔尺寸增大按钮
    const $sizeValue = $('.playback #sizeValue');                       // 画笔尺寸显示值
    const $colorPicker = $('.playback #colorPicker');                   // 画笔颜色选择器
    const $clearBtn = $('.playback #clearBtn');                         // 清空画布按钮

    // 缩放控件节点
    const $zoomOutBtn = $('.playback #zoomOutBtn');         // 缩小按钮
    const $zoomInBtn = $('.playback #zoomInBtn');           // 放大按钮
    const $zoomResetBtn = $('.playback #zoomResetBtn');     // 重置缩放按钮
    const $zoomValue = $('.playback #zoomValue');           // 缩放比例显示值

    // 全屏控件节点
    const $fullscreenBtn = $('.playback #fullscreenBtn');   // 全屏/退出全屏按钮

    // 放映模式控制按钮节点
    const $enterPlayback = $('#enterPlayback');     // 进入放映模式按钮
    const $exitBtn = $('.playback #exitBtn');       // 退出放映模式按钮

    // TOC目录节点
    const $tocBtn = $('.playback #tocBtn');                            // TOC显示/隐藏切换按钮
    const $playbackTOC = $('.playback #playbackTOC');                  // TOC主容器
    const $tocList = $playbackTOC.find('.playback-toc-list');   // TOC列表容器
    const $tocCloseBtn = $('.playback #tocCloseBtn');                  // TOC关闭按钮

    // ====================== 全局状态变量 ======================
    const state = {
        isDrawing: false,                                                       // 是否处于绘图状态
        isEraserActive: false,                                                  // 是否启用橡皮擦模式
        brushColor: CONFIG.DEFAULT_BRUSH_COLOR,                                 // 当前画笔颜色
        brushSize: CONFIG.BRUSH_SIZE_STEPS[CONFIG.DEFAULT_BRUSH_SIZE_INDEX],    // 当前画笔尺寸
        currentSizeIndex: CONFIG.DEFAULT_BRUSH_SIZE_INDEX,                      // 当前画笔尺寸索引
        zoomScale: 1.0,                                                         // 当前缩放比例
        isTOCActive: false,                                                     // TOC是否显示
        isEventsBound: false                                                    // 标记事件是否已绑定，防止重复绑定
    };

    // ====================== 工具函数 ======================
    /**
     * 限制高频触发的函数执行频率
     * @param {Function} fn - 要节流的函数
     * @param {Number} delay - 节流延迟时间
     * @returns {Function} 节流后的函数
     */
    function throttle(fn, delay = 100) {
        let timer = null;
        return function(...args) {
            if (!timer) {
                timer = setTimeout(() => {
                    fn.apply(this, args);
                    timer = null;
                }, delay);
            }
        };
    }

    // ====================== 画布 ======================
    /**
     * 初始化画布
     */
    function initCanvas() {
        if (!canvas) {
            return;
        }

        const viewportWidth = $window.width();
        const viewportHeight = $window.height();
        const dpr = window.devicePixelRatio || 1;   // 设备像素比，适配高清屏

        // 设置画布实际尺寸，解决模糊问题
        canvas.width = viewportWidth * dpr;
        canvas.height = viewportHeight * dpr;
        // 设置画布显示尺寸，匹配视口大小
        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;

        // 初始化画布2D上下文对象
        ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        // 设置画布默认样式
        ctx.scale(dpr, dpr);    // 适配设备像素比
        ctx.lineCap = 'round';  // 线条端点为圆角
        ctx.lineJoin = 'round'; // 线条连接点为圆角
        clearCanvas();          // 初始化时清空画布
    }

    /**
     * 清空画布内容
     */
    function clearCanvas() {
        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, $window.width(), $window.height());
    }

    /**
     * 获取鼠标在画布上的相对坐标
     * @param {MouseEvent} e - 鼠标事件对象
     * @returns {Object} {x: 横坐标, y: 纵坐标}
     */
    function getCanvasPos(e) {
        return { x: e.clientX, y: e.clientY };
    }

    // 画布初始化节流版本，避免高频触发
    const throttledInitCanvas = throttle(initCanvas, 200);

    // ====================== 全屏控制 ======================
    /**
     * 进入全屏模式
     */
    function enterFullscreen() {
        const elem = document.documentElement;
        // 兼容多浏览器
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        updateFullscreenBtn(true);
        throttledInitCanvas(); // 节流执行画布初始化
    }

    /**
     * 退出全屏模式
     */
    function exitFullscreen() {
        // 兼容多浏览器
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        updateFullscreenBtn(false);
        throttledInitCanvas(); // 节流执行画布初始化
    }

    /**
     * 更新全屏按钮的显示状态
     * @param {Boolean} isFullscreen - 是否处于全屏状态
     */
    function updateFullscreenBtn(isFullscreen) {
        const icon = isFullscreen ? 'fa-compress' : 'fa-expand';
        const tooltip = isFullscreen ? '退出全屏' : '进入全屏';
        $fullscreenBtn.html(`<i class="fas ${icon}"></i>`).attr('data-tooltip', tooltip);
    }

    /**
     * 判断当前是否处于全屏模式
     * @returns {Boolean} true=全屏，false=非全屏
     */
    function isFullscreenMode() {
        return !!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.msFullscreenElement;
    }

    // ====================== 画笔/橡皮擦 ======================
    /**
     * 禁用绘图模式
     */
    function disableDrawMode() {
        state.isDrawing = false;
        state.isEraserActive = false;
        $canvas.removeClass('drawing');     // 移除绘图模式标识类
        clearCanvas();

        // 更新按钮激活状态
        $disableDrawBtn.addClass('active');
        $drawBtn.removeClass('active');
        $eraserBtn.removeClass('active');
    }

    /**
     * 更新画笔尺寸
     */
    function updateBrushSize() {
        state.brushSize = CONFIG.BRUSH_SIZE_STEPS[state.currentSizeIndex];
        $sizeValue.text(state.brushSize);                               // 显示当前尺寸值
        $brushSizeControls.attr('data-size', state.brushSize);    // 尺寸标识属性
        $sizePrev.css('color', state.brushColor);                 // 同步预览块颜色

        // 边界控制，禁用/启用尺寸调整按钮
        $sizeDownBtn.prop('disabled', state.currentSizeIndex <= 0);                                     // 最小尺寸时禁用减小
        $sizeUpBtn.prop('disabled', state.currentSizeIndex >= CONFIG.BRUSH_SIZE_STEPS.length - 1);      // 最大尺寸时禁用增大
    }

    // ====================== 缩放 ======================
    /**
     * 更新缩放比例
     */
    function updateZoom() {
        const zoomPercent = Math.round(state.zoomScale * 100); // 转换为百分比

        $zoomValue.text(`${zoomPercent}%`);     // 显示当前缩放值

        // 应用缩放到内容容器
        $playbackContent.css({
            'transform': `scale(${state.zoomScale})`,
            'transform-origin': 'center top'    // 缩放原点，顶部居中
        });

        // 边界控制，禁用/启用缩放按钮
        $zoomOutBtn.prop('disabled', state.zoomScale <= CONFIG.ZOOM.min);   // 最小缩放时禁用缩小
        $zoomInBtn.prop('disabled', state.zoomScale >= CONFIG.ZOOM.max);    // 最大缩放时禁用放大
    }

    /**
     * 重置缩放比例
     */
    function resetZoom() {
        state.zoomScale = 1.0;
        updateZoom();
    }

    // ====================== 懒加载图片处理 ======================
    /**
     * 强制加载容器内的懒加载图片
     * @param {jQuery} $container - 目标容器jQuery对象
     */
    function forceLoadLazyImages($container) {
        if (!$container || !$container.length) {
            return;
        }

        $container.find('img.lazyload').each(function() {
            const $img = $(this);
            // 优先读取data-original，其次data-src，最后src
            const src = $img.attr('data-original') || $img.attr('data-src') || $img.attr('src');
            if (src) {
                $img.attr('src', src).removeClass('lazyload');      // 加载图片并移除懒加载类
            }
        });
    }

    // ====================== TOC目录 =====================
    /**
     * 渲染TOC列表内容
     */
    function renderTOC() {
        // 渲染前先解绑TOC相关事件，防止重复绑定
        $tocList.off('.playback');
        $playbackTOC.off('.playback');
        // 清空原有列表内容
        $tocList.empty();

        // 获取放映模式内容中的标题元素
        const $titles = $playbackContent.find(CONFIG.TITLE_SELECTORS);
        if (!$titles.length) {
            return;
        }

        // 遍历标题生成目录项
        $titles.each(function(index) {
            const $title = $(this);
            const titleText = $title.text().trim();
            if (!titleText) {
                return;
            }

            // 给标题添加唯一ID
            const titleId = `playback-toc-title-${index}`;
            $title.attr('id', titleId);

            // 获取标题层级
            const level = parseInt($title.prop('tagName').replace('H', ''));

            // 生成目录项HTML
            const tocItem = `
                <li class="playback-toc-item playback-toc-level-${level}">
                    <a href="#${titleId}" class="playback-toc-link" data-index="${index}">${titleText}</a>
                </li>
            `;
            $tocList.append(tocItem);
        });

        // 绑定目录项点击跳转事件
        bindTOCClick();
    }

    /**
     * 绑定TOC目录项点击跳转事件
     */
    function bindTOCClick() {
        if (!$playbackTOC.length || !$tocList.length) {
            return;
        }

        // 直接绑定到目录项
        $tocList.find('.playback-toc-link').off('click.playback').on('click.playback', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const index = parseInt($(this).data('index'));
            const $target = $playbackContent.find(CONFIG.TITLE_SELECTORS).eq(index);

            if (!$target.length) {
                return;
            }

            // 计算目标滚动位置
            const titleOffsetInContent = $target[0].offsetTop;              // 标题在内容容器中的原始偏移
            const scaledOffset = titleOffsetInContent * state.zoomScale;    // 适配缩放比例
            const finalOffset = scaledOffset - 60;                          // 固定偏移

            // 执行滚动到目标位置
            const scrollContainer = $main[0];
            scrollContainer.scrollTop = finalOffset;
        });

        // 事件委托兜底，防止动态生成的目录项绑定失效
        $playbackTOC.off('click.playback', '.playback-toc-link').on('click.playback', '.playback-toc-link', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const index = parseInt($(this).data('index'));
            const $target = $playbackContent.find(CONFIG.TITLE_SELECTORS).eq(index);
            if ($target.length) {
                $main[0].scrollTop = ($target[0].offsetTop * state.zoomScale) - 60;
            }
        });
    }

    /**
     * 显示TOC目录
     */
    function showTOC() {
        if (!$playbackTOC.length) {
            return;
        }

        state.isTOCActive = true;
        $playbackTOC.addClass('active');

        $tocBtn.addClass('active');
        $tocBtn.attr('data-tooltip', '隐藏目录');
    }

    /**
     * 隐藏TOC目录
     */
    function hideTOC() {
        if (!$playbackTOC.length) {
            return;
        }

        state.isTOCActive = false;
        $playbackTOC.removeClass('active');

        $tocBtn.removeClass('active');
        $tocBtn.attr('data-tooltip', '显示目录');
    }

    /**
     * 切换TOC显示/隐藏状态
     */
    function toggleTOC() {
        state.isTOCActive ? hideTOC() : showTOC();
    }

    // ====================== 事件绑定 ======================
    /**
     * 绑定事件
     */
    function bindEvents() {
        // 防止重复绑定：已绑定则直接返回
        if (state.isEventsBound) {
            return;
        }

        // TOC关闭按钮点击事件
        $tocCloseBtn.off('click.playback').on('click.playback', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideTOC();
        });

        // TOC切换按钮点击事件
        $tocBtn.off('click.playback').on('click.playback', function() {
            if ($tocList.find('.playback-toc-link').length === 0) {
                renderTOC();
            }
            toggleTOC();
        });

        // 全屏状态变化监听
        $document.on('fullscreenchange.playback webkitfullscreenchange.playback MSFullscreenChange.playback', function() {
            updateFullscreenBtn(isFullscreenMode());
            throttledInitCanvas();   // 节流执行画布初始化
        });

        // 全屏按钮点击事件
        $fullscreenBtn.off('click.playback').on('click.playback', function() {
            isFullscreenMode() ? exitFullscreen() : enterFullscreen();
        });

        // 退出放映模式按钮点击事件
        $exitBtn.off('click.playback').on('click.playback', function() {
            // 退出全屏
            if (isFullscreenMode()) {
                exitFullscreen();
            }

            // 清理放映模式状态
            $main.removeClass('active');
            $toolbar.hide();
            $body.css('overflow', 'auto');
            disableDrawMode();      // 禁用绘图模式

            // 重置内容容器样式，避免缩放残留
            $playbackContent.css('transform', 'none');

            // 清空TOC列表
            $tocList.empty();

            // 清空内容容器
            $playbackContent.html('');
            $originalContent = null;

            // 隐藏TOC并重置状态
            hideTOC();
            $tocBtn.removeClass('active');
            $tocBtn.attr('data-tooltip', '显示目录');

            // 销毁绑定事件
            destroyEvents();
        });

        // 禁用绘图按钮点击事件
        $disableDrawBtn.off('click.playback').on('click.playback', disableDrawMode);

        // 画笔模式按钮点击事件
        $drawBtn.off('click.playback').on('click.playback', function() {
            state.isEraserActive = false;
            $canvas.addClass('drawing');

            $drawBtn.addClass('active');
            $eraserBtn.removeClass('active');
            $disableDrawBtn.removeClass('active');
        });

        // 橡皮擦模式按钮点击事件
        $eraserBtn.off('click.playback').on('click.playback', function() {
            state.isEraserActive = true;
            $canvas.addClass('drawing');

            $eraserBtn.addClass('active');
            $drawBtn.removeClass('active');
            $disableDrawBtn.removeClass('active');
        });

        // 画笔尺寸减小按钮点击事件
        $sizeDownBtn.off('click.playback').on('click.playback', function() {
            if (state.currentSizeIndex > 0) {
                state.currentSizeIndex--;
                updateBrushSize();
            }
        });

        // 画笔尺寸增大按钮点击事件
        $sizeUpBtn.off('click.playback').on('click.playback', function() {
            if (state.currentSizeIndex < CONFIG.BRUSH_SIZE_STEPS.length - 1) {
                state.currentSizeIndex++;
                updateBrushSize();
            }
        });

        // 颜色选择器变更事件
        $colorPicker.off('change.playback').on('change.playback', function() {
            state.brushColor = $(this).val();
            $sizePrev.css('color', state.brushColor);   // 同步预览块颜色
        });

        // 清空画布按钮点击事件
        $clearBtn.off('click.playback').on('click.playback', clearCanvas);

        // 鼠标按下开始绘图（仅在绘图时绑定mousemove，减少性能开销）
        $canvas.off('mousedown.playback').on('mousedown.playback', function(e) {
            if (!$canvas.hasClass('drawing') || !ctx) {
                return;
            }

            state.isDrawing = true;
            const pos = getCanvasPos(e);

            // 开始绘制路径
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);

            // 设置绘图样式
            if (state.isEraserActive) {
                ctx.globalCompositeOperation = 'destination-out';   // 橡皮擦模式
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = state.brushSize * 2;                // 橡皮擦尺寸加倍
            } else {
                ctx.globalCompositeOperation = 'source-over';       // 正常绘图模式
                ctx.strokeStyle = state.brushColor;
                ctx.lineWidth = state.brushSize;
            }

            // 仅在绘图时绑定mousemove，避免全局持续监听
            $document.off('mousemove.playback').on('mousemove.playback', function(e) {
                if (!state.isDrawing || !ctx) {
                    return;
                }

                const pos = getCanvasPos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();       // 绘制线条
            });
        });

        // 鼠标松开/离开停止绘图（解绑mousemove，减少性能开销）
        $document.off('mouseup.playback mouseleave.playback').on('mouseup.playback mouseleave.playback', function() {
            if (state.isDrawing && ctx) {
                state.isDrawing = false;
                ctx.globalCompositeOperation = 'source-over';   // 恢复默认合成模式
                $document.off('mousemove.playback');            // 解绑mousemove
            }
        });

        // 放大按钮点击事件
        $zoomInBtn.off('click.playback').on('click.playback', function() {
            if (state.zoomScale < CONFIG.ZOOM.max) {
                state.zoomScale = Math.round((state.zoomScale + CONFIG.ZOOM.step) * 10) / 10;
                updateZoom();
            }
        });

        // 缩小按钮点击事件
        $zoomOutBtn.off('click.playback').on('click.playback', function() {
            if (state.zoomScale > CONFIG.ZOOM.min) {
                state.zoomScale = Math.round((state.zoomScale - CONFIG.ZOOM.step) * 10) / 10;
                updateZoom();
            }
        });

        // 重置缩放按钮点击事件
        $zoomResetBtn.off('click.playback').on('click.playback', resetZoom);

        // 窗口大小调整事件（节流执行，避免频繁触发）
        $window.off('resize.playback').on('resize.playback', function() {
            if ($main.hasClass('active')) {
                throttledInitCanvas();
            }
        });

        // ESC键退出
        $document.off('keydown.playback').on('keydown.playback', function(e) {
            if (e.key === 'Escape') {
                if (state.isTOCActive) {
                    hideTOC();          // 关闭TOC
                } else if (isFullscreenMode()) {
                    exitFullscreen();   // 退出全屏
                } else if ($main.hasClass('active')) {
                    $exitBtn.click();   // 退出放映模式
                }
            }
        });

        // 绑定完成后标记为已绑定
        state.isEventsBound = true;
    }

    /**
     * 销毁所有绑定的事件
     */
    function destroyEvents() {
        // 解绑所有事件
        $tocCloseBtn.off('.playback');
        $tocBtn.off('.playback');
        $document.off('.playback');
        $fullscreenBtn.off('.playback');
        $exitBtn.off('.playback');
        $disableDrawBtn.off('.playback');
        $drawBtn.off('.playback');
        $eraserBtn.off('.playback');
        $sizeDownBtn.off('.playback');
        $sizeUpBtn.off('.playback');
        $colorPicker.off('.playback');
        $clearBtn.off('.playback');
        $canvas.off('.playback');
        $window.off('.playback');
        $playbackTOC.off('.playback');
        $tocList.off('.playback');

        // 清理画布上下文
        if (ctx) {
            ctx.clearRect(0, 0, $window.width(), $window.height());
            ctx = null;
        }

        // 清理定时器
        clearTimeout(window.playbackFullscreenTimer);

        // 重置状态
        state.isDrawing = false;
        state.isEraserActive = false;
        state.zoomScale = 1.0;
        state.isTOCActive = false;
        state.currentSizeIndex = CONFIG.DEFAULT_BRUSH_SIZE_INDEX;
        state.brushColor = CONFIG.DEFAULT_BRUSH_COLOR;
        state.isEventsBound = false;
    }

    // 进入放映模式按钮点击事件
    $enterPlayback.off('click.playback-global').on('click.playback-global', function() {
        // 无原始内容则不进入放映模式
        $originalContent = $('.post-content');
        if (!$originalContent.length) {
            return;
        }

        // 清空容器后再赋值，减少DOM重排重绘
        $playbackContent.empty();
        // 复制原始内容到放映模式容器
        $playbackContent.html($originalContent.prop('outerHTML'));
        // 移除aisummary
        $playbackContent.find('.aisummary').remove();

        // 强制加载懒加载图片
        forceLoadLazyImages($playbackContent);

        // 渲染TOC列表内容
        renderTOC();

        // 显示放映模式容器和工具栏
        $main.addClass('active');
        $toolbar.show();
        $body.css('overflow', 'hidden');

        // 初始化画布和工具状态
        initCanvas();           // 初始化绘图画布
        disableDrawMode();      // 禁用绘图模式
        resetZoom();            // 重置缩放为100%
        updateBrushSize();      // 初始化画笔尺寸
        updateZoom();           // 初始化缩放

        // 清空原有定时器，防止多次触发全屏
        clearTimeout(window.playbackFullscreenTimer);
        // 自动进入全屏
        window.playbackFullscreenTimer = setTimeout(enterFullscreen, 50);

        // 重置事件绑定标记，确保可以重新绑定
        state.isEventsBound = false;
        // 绑定所有事件
        bindEvents();
    });
});
