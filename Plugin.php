<?php
/**
 * 文章放映插件
 *
 * @package playback
 * @author 多仔
 * @version 1.1
 * @link https://www.duox.dev
 */
if (!defined('__TYPECHO_ROOT_DIR__')) exit;

class playback_Plugin implements Typecho_Plugin_Interface
{
    /**
     * 激活插件方法,如果激活失败,直接抛出异常
     *
     * @access public
     * @return void
     * @throws Typecho_Plugin_Exception
     */
    public static function activate() {
        Typecho_Plugin::factory('Widget_Archive')->header = array(__CLASS__, 'header');
        Typecho_Plugin::factory('Widget_Archive')->footer = array(__CLASS__, 'footer');
    }
    
    /**
     * 要用插件方法,如果禁用失败,直接抛出异常
     *
     * @static
     * @access public
     * @return void
     * @throws Typecho_Plugin_Exception
     */
    public static function deactivate() {}
    
    /**
     * 获取插件配置面板
     *
     * @access public
     * @param Typecho_Widget_Helper_Form $form 配置面板
     * @return void
     */
    public static function config(Typecho_Widget_Helper_Form $form) {}
    
    /**
     * 个人用户的配置面板
     *
     * @access public
     * @param Typecho_Widget_Helper_Form $form
     * @return void
     */
    public static function personalConfig(Typecho_Widget_Helper_Form $form) {}
    
    /**
     * 插件实现方法
     *
     * @access public
     * @return void
     */
    public static function render() {}
    
    /**
     * 添加header信息
     * @return void
     */
    public static function header() {
        $rootDirname = Helper::options()->pluginUrl.'/playback';
        
        echo <<<HTML
        <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link rel="stylesheet" href="$rootDirname/css/plugins.min.css">
        HTML;
    }
    
    /**
     * 添加footer信息
     * @return void
     */
    public static function footer(): void
    {
        $rootDirname = Helper::options()->pluginUrl.'/playback';
        
        echo <<<HTML
        <script type="text/javascript" src="{$rootDirname}/js/plugins.min.js"></script>
        
        <!-- 放映模式 -->
        <div class="playback">
            <div class="playback-main" id="playbackMain">
                <div class="playback-content" id="playbackContent"></div>
            </div>
            
            <div class="playback-toc-panel" id="playbackTOC">
                <div class="playback-toc-header">
                    <h3>目录</h3>
                    <button class="playback-toc-close" id="tocCloseBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="playback-toc-container">
                    <ul class="playback-toc-list"></ul>
                </div>
            </div>
            <canvas id="playbackDrawingCanvas"></canvas>

            <div class="playback-toolbar" id="playbackToolbar" style="display: none;">
                <button id="dragBtn" class="drag-btn active" data-tooltip="拖拽">
                    <i class="fas fa-arrows-alt"></i>
                </button>
                <button id="drawBtn" data-tooltip="画笔">
                    <i class="fas fa-pen"></i>
                </button>
                <button id="eraserBtn" data-tooltip="橡皮擦">
                    <i class="fas fa-eraser"></i>
                </button>
                <button class="playback-toolbar-btn" id="laserBtn" data-tooltip="激光笔">
                    <i class="fas fa-highlighter"></i>
                </button>
                <input type="color" id="colorPicker" class="color-picker" value="#ff0000" data-tooltip="选择画笔颜色">
                <div id="brushSizeControls" class="brush-size-controls" data-size="8">
                    <button id="sizeDownBtn" data-tooltip="减小笔粗细">
                        <i class="fas fa-minus"></i>
                    </button>
                    <div class="size-prev" style="color: #ff0000;"></div>
                    <span class="size-value" id="sizeValue">8</span>
                    <button id="sizeUpBtn" data-tooltip="增大笔粗细">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="zoom-controls">
                    <button id="zoomOutBtn" data-tooltip="缩小画布">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="zoom-value" id="zoomValue">100%</span>
                    <button id="zoomInBtn" data-tooltip="放大画布">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button id="zoomResetBtn" data-tooltip="重置画布">
                        <i class="fas fa-compress-arrows-alt"></i>
                    </button>
                </div>
                <button id="clearBtn" data-tooltip="清空画布">
                    <i class="fas fa-trash"></i>
                </button>
                <button id="tocBtn" class="playback-toc-btn" data-tooltip="目录">
                    <i class="fas fa-list"></i>
                </button>
                <button id="fullscreenBtn" class="fullscreen-btn" data-tooltip="全屏/退出全屏">
                    <i class="fas fa-expand"></i>
                </button>
                <button id="exitBtn" class="close-btn" data-tooltip="退出放映模式">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        </div>
        HTML;
    }

}
