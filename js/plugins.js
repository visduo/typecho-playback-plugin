$(document).ready(function() {
    const CONFIG = {
        BRUSH_SIZE_STEPS: [1, 5, 8, 12, 20, 30],
        ZOOM: {
            min: 0.5,
            max: 2.0,
            step: 0.1
        },
        DEFAULT_BRUSH_COLOR: '#ff0000',
        DEFAULT_BRUSH_SIZE_INDEX: 1,
        TITLE_SELECTORS: 'h1, h2, h3, h4, h5',
        LASER: {
            size: 12,
            opacity: 0.9
        }
    };

    const $document = $(document);
    const $window = $(window);
    const $body = $('body');

    const $mainContainer = $('.playback #playbackMain');
    const $contentContainer = $('.playback #playbackContent');
    const $toolbarContainer = $('.playback #playbackToolbar');
    let $originalContent = $('.post-content');

    const $canvas = $('.playback #playbackDrawingCanvas');
    const canvasElement = $canvas[0];
    let canvasContext = null;

    const $brushSizeControls = $('.playback #brushSizeControls');
    const $sizePreview = $('.playback .brush-size-controls .size-prev');
    const $dragModeBtn = $('.playback #dragBtn');
    const $drawModeBtn = $('.playback #drawBtn');
    const $eraserModeBtn = $('.playback #eraserBtn');
    const $sizeDownBtn = $('.playback #sizeDownBtn');
    const $sizeUpBtn = $('.playback #sizeUpBtn');
    const $sizeDisplay = $('.playback #sizeValue');
    const $colorPicker = $('.playback #colorPicker');
    const $clearCanvasBtn = $('.playback #clearBtn');
    const $laserModeBtn = $('.playback #laserBtn');
    let $laserPointer = null;
    const LASER_CLASS = 'playback-laser-pointer';

    const $zoomOutBtn = $('.playback #zoomOutBtn');
    const $zoomInBtn = $('.playback #zoomInBtn');
    const $zoomResetBtn = $('.playback #zoomResetBtn');
    const $zoomDisplay = $('.playback #zoomValue');

    const $fullscreenBtn = $('.playback #fullscreenBtn');

    const $enterPlaybackBtn = $('#enterPlayback');
    const $exitPlaybackBtn = $('.playback #exitBtn');

    const $tocToggleBtn = $('.playback #tocBtn');
    const $tocContainer = $('.playback #playbackTOC');
    const $tocListContainer = $tocContainer.find('.playback-toc-list');
    const $tocCloseBtn = $('.playback #tocCloseBtn');

    const appState = {
        isDrawing: false,
        isEraserActive: false,
        brushColor: CONFIG.DEFAULT_BRUSH_COLOR,
        brushSize: CONFIG.BRUSH_SIZE_STEPS[CONFIG.DEFAULT_BRUSH_SIZE_INDEX],
        currentSizeIndex: CONFIG.DEFAULT_BRUSH_SIZE_INDEX,
        zoomScale: 1.0,
        isTOCActive: false,
        isLaserActive: false,
        isEventsBound: false,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        dragStartOffsetX: 0,
        dragStartOffsetY: 0,
        contentOffsetX: 0,
        contentOffsetY: 0
    };

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

    function initCanvas() {
        if (!canvasElement) {
            return;
        }

        const viewportWidth = $window.width();
        const viewportHeight = $window.height();
        const devicePixelRatio = window.devicePixelRatio || 1;

        canvasElement.width = viewportWidth * devicePixelRatio;
        canvasElement.height = viewportHeight * devicePixelRatio;
        canvasElement.style.width = `${viewportWidth}px`;
        canvasElement.style.height = `${viewportHeight}px`;

        canvasElement.style.webkitTouchCallout = 'none';
        canvasElement.style.webkitUserSelect = 'none';

        canvasContext = canvasElement.getContext('2d');
        if (!canvasContext) {
            return;
        }

        canvasContext.scale(devicePixelRatio, devicePixelRatio);
        canvasContext.lineCap = 'round';
        canvasContext.lineJoin = 'round';
        clearCanvas();
    }

    function clearCanvas() {
        if (!canvasContext) {
            return;
        }
        canvasContext.clearRect(0, 0, $window.width(), $window.height());
    }

    function getEventPosition(e) {
        if (e.type.includes('touch')) {
            const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
            return { x: touch.clientX, y: touch.clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function preventTouchDefault(e) {
        if (e.target === canvasElement || $(e.target).closest($canvas).length) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    const throttledInitCanvas = throttle(initCanvas, 200);

    function enterFullscreen() {
        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        updateFullscreenBtn(true);
        throttledInitCanvas();
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        updateFullscreenBtn(false);
        throttledInitCanvas();
    }

    function updateFullscreenBtn(isFullscreen) {
        const iconClass = isFullscreen ? 'fa-compress' : 'fa-expand';
        const tooltipText = isFullscreen ? '退出全屏' : '进入全屏';
        $fullscreenBtn.html(`<i class="fas ${iconClass}"></i>`).attr('data-tooltip', tooltipText);
    }

    function isFullscreenMode() {
        return !!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.msFullscreenElement;
    }

    function disableDrawMode() {
        appState.isDrawing = false;
        appState.isEraserActive = false;
        $canvas.removeClass('drawing');
        clearCanvas();

        $dragModeBtn.addClass('active');
        $drawModeBtn.removeClass('active');
        $eraserModeBtn.removeClass('active');

        updateDragState();
    }

    function activateLaser() {
        disableDrawMode();
        appState.isLaserActive = true;
        $laserModeBtn.addClass('active');
        $body.addClass('laser-active');

        $body.css('cursor', 'none');

        if (!$laserPointer) {
            $laserPointer = $(`<div class="${LASER_CLASS}"></div>`);
            $laserPointer.css({
                width: `${CONFIG.LASER.size}px`,
                height: `${CONFIG.LASER.size}px`,
                background: appState.brushColor,
                boxShadow: `0 0 12px ${appState.brushColor}, 0 0 24px ${appState.brushColor}`,
                opacity: CONFIG.LASER.opacity,
                zIndex: 99999,
                position: 'fixed',
                pointerEvents: 'none'
            });
            $body.append($laserPointer);
        }

        $document.one('mousemove.laseronce', function(e) {
            $laserPointer.css({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`,
                display: 'block'
            });
            $document.off('mousemove.laseronce');
        });

        $document.on('mousemove.laser', function(e) {
            $laserPointer.css({
                left: `${e.clientX}px`,
                top: `${e.clientY}px`,
                display: 'block'
            });
        });
    }

    function deactivateLaser() {
        appState.isLaserActive = false;
        $laserModeBtn.removeClass('active');
        $body.removeClass('laser-active');
        $body.css('cursor', '');
        if ($laserPointer) $laserPointer.hide();
        $document.off('mousemove.laser');
    }

    function toggleLaser() {
        if (appState.isLaserActive) {
            deactivateLaser();
            updateDragState();
        } else {
            activateLaser();
            $dragModeBtn.removeClass('active');
            appState.isDragging = false;
            $mainContainer.css('cursor', 'default');
        }
    }

    function syncLaserColor() {
        if ($laserPointer) {
            $laserPointer.css({
                background: appState.brushColor,
                boxShadow: `0 0 12px ${appState.brushColor}, 0 0 24px ${appState.brushColor}`
            });
        }
    }

    function updateBrushSize() {
        appState.brushSize = CONFIG.BRUSH_SIZE_STEPS[appState.currentSizeIndex];
        $sizeDisplay.text(appState.brushSize);
        $brushSizeControls.attr('data-size', appState.brushSize);
        $sizePreview.css('color', appState.brushColor);

        $sizeDownBtn.prop('disabled', appState.currentSizeIndex <= 0);
        $sizeUpBtn.prop('disabled', appState.currentSizeIndex >= CONFIG.BRUSH_SIZE_STEPS.length - 1);
    }

    function updateZoom() {
        const zoomPercent = Math.round(appState.zoomScale * 100);
        $zoomDisplay.text(`${zoomPercent}%`);

        applyTransform();

        $zoomOutBtn.prop('disabled', appState.zoomScale <= CONFIG.ZOOM.min);
        $zoomInBtn.prop('disabled', appState.zoomScale >= CONFIG.ZOOM.max);

        updateDragState();
    }

    function applyTransform() {
        const transformString = `scale(${appState.zoomScale}) translate(${appState.contentOffsetX}px, ${appState.contentOffsetY}px)`;
        $contentContainer.css({
            'transform': transformString,
            'transform-origin': 'center top'
        });
    }

    function resetZoom() {
        appState.zoomScale = 1.0;
        appState.contentOffsetX = 0;
        appState.contentOffsetY = 0;
        updateZoom();
        updateDragState();
        $mainContainer[0].scrollTop = 0;
    }

    function updateDragState() {
        if (!appState.isLaserActive && !$canvas.hasClass('drawing')) {
            $mainContainer.css('cursor', 'grab');
            $dragModeBtn.addClass('active');
        } else {
            $mainContainer.css('cursor', 'default');
            appState.isDragging = false;
            if (appState.isLaserActive || $canvas.hasClass('drawing')) {
                $dragModeBtn.removeClass('active');
            }
        }
    }

    function forceLoadLazyImages($container) {
        if (!$container || !$container.length) {
            return;
        }

        $container.find('img.lazyload').each(function() {
            const $img = $(this);
            const src = $img.attr('data-original') || $img.attr('data-src') || $img.attr('src');
            if (src) {
                $img.attr('src', src).removeClass('lazyload');
            }
        });
    }

    function renderTOC() {
        $tocListContainer.off('.playback');
        $tocContainer.off('.playback');
        $tocListContainer.empty();

        const $titles = $contentContainer.find(CONFIG.TITLE_SELECTORS);
        if (!$titles.length) {
            return;
        }

        $titles.each(function(index) {
            const $title = $(this);
            const titleText = $title.text().trim();

            if (!titleText) {
                return;
            }

            const titleId = `playback-toc-title-${index}`;
            $title.attr('id', titleId);

            const level = parseInt($title.prop('tagName').replace('H', ''));

            const tocItem = `
                <li class="playback-toc-item playback-toc-level-${level}">
                    <a href="#${titleId}" class="playback-toc-link" data-index="${index}">${titleText}</a>
                </li>
            `;
            $tocListContainer.append(tocItem);
        });

        bindTOCClickEvents();
    }

    function bindTOCClickEvents() {
        if (!$tocContainer.length || !$tocListContainer.length) {
            return;
        }

        $tocListContainer.find('.playback-toc-link').off('click.playback').on('click.playback', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const index = parseInt($(this).data('index'));
            const $target = $contentContainer.find(CONFIG.TITLE_SELECTORS).eq(index);

            if (!$target.length) {
                return;
            }

            const titleOffsetInContent = $target[0].offsetTop;
            const scaledOffset = titleOffsetInContent * appState.zoomScale;
            $mainContainer[0].scrollTop = scaledOffset - 60;
        });

        $tocContainer.off('click.playback', '.playback-toc-link').on('click.playback', '.playback-toc-link', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const index = parseInt($(this).data('index'));
            const $target = $contentContainer.find(CONFIG.TITLE_SELECTORS).eq(index);

            if ($target.length) {
                $mainContainer[0].scrollTop = ($target[0].offsetTop * appState.zoomScale) - 60;
            }
        });
    }

    function showTOC() {
        if (!$tocContainer.length) {
            return;
        }

        appState.isTOCActive = true;
        $tocContainer.addClass('active');
        $tocToggleBtn.addClass('active');
        $tocToggleBtn.attr('data-tooltip', '隐藏目录');
    }

    function hideTOC() {
        if (!$tocContainer.length) {
            return;
        }

        appState.isTOCActive = false;
        $tocContainer.removeClass('active');
        $tocToggleBtn.removeClass('active');
        $tocToggleBtn.attr('data-tooltip', '显示目录');
    }

    function toggleTOC() {
        appState.isTOCActive ? hideTOC() : showTOC();
    }

    function bindAllEvents() {
        if (appState.isEventsBound) {
            return;
        }

        $tocCloseBtn.off('click.playback').on('click.playback', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideTOC();
        });

        $tocToggleBtn.off('click.playback').on('click.playback', function() {
            if ($tocListContainer.find('.playback-toc-link').length === 0) {
                renderTOC();
            }
            toggleTOC();
        });

        $document.on('fullscreenchange.playback webkitfullscreenchange.playback MSFullscreenChange.playback', function() {
            updateFullscreenBtn(isFullscreenMode());
            throttledInitCanvas();
        });

        $fullscreenBtn.off('click.playback').on('click.playback', function() {
            isFullscreenMode() ? exitFullscreen() : enterFullscreen();
        });

        $exitPlaybackBtn.off('click.playback').on('click.playback', function() {
            if (isFullscreenMode()) {
                exitFullscreen();
            }

            $mainContainer.removeClass('active');
            $toolbarContainer.hide();
            $body.css('overflow', 'auto');

            disableDrawMode();
            deactivateLaser();

            $contentContainer.css('transform', 'none');

            $tocListContainer.empty();
            hideTOC();
            $tocToggleBtn.removeClass('active');
            $tocToggleBtn.attr('data-tooltip', '显示目录');

            destroyAllEvents();
        });

        $dragModeBtn.off('click.playback').on('click.playback', function() {
            disableDrawMode();
            deactivateLaser();
            $dragModeBtn.addClass('active');
        });

        $drawModeBtn.off('click.playback').on('click.playback', function() {
            deactivateLaser();
            appState.isEraserActive = false;
            $canvas.addClass('drawing');
            $drawModeBtn.addClass('active');
            $eraserModeBtn.removeClass('active');
            $dragModeBtn.removeClass('active');
        });

        $eraserModeBtn.off('click.playback').on('click.playback', function() {
            deactivateLaser();
            appState.isEraserActive = true;
            $canvas.addClass('drawing');
            $eraserModeBtn.addClass('active');
            $drawModeBtn.removeClass('active');
            $dragModeBtn.removeClass('active');
        });

        $laserModeBtn.off('click.playback').on('click.playback', toggleLaser);

        $sizeDownBtn.off('click.playback').on('click.playback', function() {
            if (appState.currentSizeIndex > 0) {
                appState.currentSizeIndex--;
                updateBrushSize();
            }
        });

        $sizeUpBtn.off('click.playback').on('click.playback', function() {
            if (appState.currentSizeIndex < CONFIG.BRUSH_SIZE_STEPS.length - 1) {
                appState.currentSizeIndex++;
                updateBrushSize();
            }
        });

        $colorPicker.off('change.playback').on('change.playback', function() {
            appState.brushColor = $(this).val();
            $sizePreview.css('color', appState.brushColor);
            syncLaserColor();
        });

        $clearCanvasBtn.off('click.playback').on('click.playback', clearCanvas);

        $canvas.off('mousedown.playback touchstart.playback').on('mousedown.playback touchstart.playback', function(e) {
            preventTouchDefault(e);

            if (!$canvas.hasClass('drawing') || !canvasContext) {
                return;
            }

            appState.isDrawing = true;
            const pos = getEventPosition(e);

            canvasContext.beginPath();
            canvasContext.moveTo(pos.x, pos.y);

            if (appState.isEraserActive) {
                canvasContext.globalCompositeOperation = 'destination-out';
                canvasContext.strokeStyle = 'rgba(0,0,0,1)';
                canvasContext.lineWidth = appState.brushSize * 2;
            } else {
                canvasContext.globalCompositeOperation = 'source-over';
                canvasContext.strokeStyle = appState.brushColor;
                canvasContext.lineWidth = appState.brushSize;
            }

            $document.off('mousemove.playback touchmove.playback').on('mousemove.playback touchmove.playback', function(e) {
                preventTouchDefault(e);
                if (!appState.isDrawing || !canvasContext) {
                    return;
                }

                const pos = getEventPosition(e);
                canvasContext.lineTo(pos.x, pos.y);
                canvasContext.stroke();
            });
        });

        $document.off('mouseup.playback touchend.playback mouseleave.playback touchcancel.playback').on('mouseup.playback touchend.playback mouseleave.playback touchcancel.playback', function(e) {
            preventTouchDefault(e);
            if (appState.isDrawing && canvasContext) {
                appState.isDrawing = false;
                canvasContext.globalCompositeOperation = 'source-over';
                $document.off('mousemove.playback touchmove.playback');
            }
        });

        $zoomInBtn.off('click.playback').on('click.playback', function() {
            if (appState.zoomScale < CONFIG.ZOOM.max) {
                appState.zoomScale = Math.round((appState.zoomScale + CONFIG.ZOOM.step) * 10) / 10;
                updateZoom();
            }
        });

        $zoomOutBtn.off('click.playback').on('click.playback', function() {
            if (appState.zoomScale > CONFIG.ZOOM.min) {
                appState.zoomScale = Math.round((appState.zoomScale - CONFIG.ZOOM.step) * 10) / 10;
                updateZoom();
            }
        });

        $zoomResetBtn.off('click.playback').on('click.playback', resetZoom);

        $window.off('resize.playback').on('resize.playback', function() {
            if ($mainContainer.hasClass('active')) {
                throttledInitCanvas();
            }
        });

        $document.off('keydown.playback').on('keydown.playback', function(e) {
            if (e.key === 'Escape') {
                if (appState.isTOCActive) {
                    hideTOC();
                } else if (isFullscreenMode()) {
                    exitFullscreen();
                } else if (appState.isLaserActive) {
                    deactivateLaser();
                } else if ($mainContainer.hasClass('active')) {
                    $exitPlaybackBtn.click();
                }
            }
        });

        $mainContainer.off('mousedown.playback-drag').on('mousedown.playback-drag', function(e) {
            if ($canvas.hasClass('drawing') || appState.isLaserActive) {
                return;
            }

            appState.isDragging = true;
            appState.dragStartX = e.clientX;
            appState.dragStartY = e.clientY;
            appState.dragStartOffsetX = appState.contentOffsetX;
            appState.dragStartOffsetY = appState.contentOffsetY;
            $mainContainer.css('cursor', 'grabbing');
            e.preventDefault();
        });

        $document.off('mousemove.playback-drag').on('mousemove.playback-drag', function(e) {
            if (!appState.isDragging || appState.isLaserActive) {
                return;
            }

            const deltaX = (e.clientX - appState.dragStartX) / appState.zoomScale;
            const deltaY = (e.clientY - appState.dragStartY) / appState.zoomScale;

            appState.contentOffsetX = appState.dragStartOffsetX + deltaX;
            appState.contentOffsetY = appState.dragStartOffsetY + deltaY;

            applyTransform();
        });

        $document.off('mouseup.playback-drag').on('mouseup.playback-drag', function() {
            if (!appState.isDragging || appState.isLaserActive) {
                return;
            }

            appState.isDragging = false;
            if (!appState.isLaserActive && !$canvas.hasClass('drawing')) {
                $mainContainer.css('cursor', 'grab');
            } else {
                $mainContainer.css('cursor', 'default');
            }
        });

        appState.isEventsBound = true;
    }

    function destroyAllEvents() {
        $tocCloseBtn.off('.playback');
        $tocToggleBtn.off('.playback');
        $document.off('.playback');
        $fullscreenBtn.off('.playback');
        $exitPlaybackBtn.off('.playback');
        $dragModeBtn.off('.playback');
        $drawModeBtn.off('.playback');
        $eraserModeBtn.off('.playback');
        $sizeDownBtn.off('.playback');
        $sizeUpBtn.off('.playback');
        $colorPicker.off('.playback');
        $clearCanvasBtn.off('.playback');
        $canvas.off('.playback');
        $window.off('.playback');
        $tocContainer.off('.playback');
        $tocListContainer.off('.playback');
        $laserModeBtn.off('.playback');
        $mainContainer.off('.playback-drag');
        $document.off('.playback-drag');

        if (canvasContext) {
            clearCanvas();
            canvasContext = null;
        }

        clearTimeout(window.playbackFullscreenTimer);

        appState.isDrawing = false;
        appState.isEraserActive = false;
        appState.zoomScale = 1.0;
        appState.isTOCActive = false;
        appState.currentSizeIndex = CONFIG.DEFAULT_BRUSH_SIZE_INDEX;
        appState.brushColor = CONFIG.DEFAULT_BRUSH_COLOR;
        appState.isLaserActive = false;
        appState.isEventsBound = false;
        appState.isDragging = false;
        appState.contentOffsetX = 0;
        appState.contentOffsetY = 0;
    }

    $enterPlaybackBtn.off('click.playback-global').on('click.playback-global', function() {
        $originalContent = $('.post-content');
        if (!$originalContent.length) {
            return;
        }

        $contentContainer.empty();
        $contentContainer.html($originalContent.prop('outerHTML'));
        $contentContainer.find('.aisummary').remove();

        forceLoadLazyImages($contentContainer);

        renderTOC();

        $mainContainer.addClass('active');
        $toolbarContainer.show();
        $body.css('overflow', 'hidden');

        initCanvas();
        disableDrawMode();
        resetZoom();
        updateBrushSize();
        updateZoom();

        clearTimeout(window.playbackFullscreenTimer);
        window.playbackFullscreenTimer = setTimeout(enterFullscreen, 50);

        $mainContainer[0].scrollTop = 0;

        appState.isEventsBound = false;
        bindAllEvents();

        $mainContainer.css('cursor', 'grab');
        $dragModeBtn.addClass('active');
    });
});
