<?php
/* Plugin Name: Rent vs Buy test */
defined('ABSPATH') || exit;
// Калькулятор виден только по адресу с ?rvb=test. Убрать его: удалить этот файл. Снять данные с публикации: удалить ещё папку wp-content/rvb-test.
add_action('wp_footer', function () {
	if (($_GET['rvb'] ?? '') !== 'test') return;
	$dir = WP_CONTENT_DIR . '/rvb-test/';
	if (!is_file($dir . 'rent-vs-buy.js') || !is_file($dir . 'data.json')) return;
	$url = content_url('rvb-test/');
	$js = $url . 'rent-vs-buy.js?v=' . filemtime($dir . 'rent-vs-buy.js');
	$data = $url . 'data.json?v=' . filemtime($dir . 'data.json');
	echo '<rent-vs-buy mode="floating" data-url="' . esc_url($data) . '"></rent-vs-buy>';
	echo '<script src="' . esc_url($js) . '"></script>';
});
