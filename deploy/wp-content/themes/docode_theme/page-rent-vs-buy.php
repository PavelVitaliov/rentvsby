<?php
// Страница калькулятора «аренда или покупка». Скрипт и данные те же, что у теста по ?rvb=test: папка wp-content/rvb-test.
$rvb_dir = WP_CONTENT_DIR . '/rvb-test/';
$rvb_ready = is_file($rvb_dir . 'rent-vs-buy.js') && is_file($rvb_dir . 'data.json');
get_header('public');
?>
<main id="main-content">
<section class="mx-rvb-hero"><div class="mx-container mx-rvb-grid">
	<div class="mx-rvb-copy"><span class="mx-kicker"><span class="mx-kicker-line"></span> RENT OR BUY</span><h1>Renting now? <em>See what buying could cost.</em></h1><p>Choose an area and size in Dubai. Compare a typical rent with an indicative mortgage payment and the cash you would need to buy.</p></div>
	<div class="mx-rvb-widget">
		<?php if ($rvb_ready) : ?>
			<rent-vs-buy data-url="<?php echo esc_url(content_url('rvb-test/data.json') . '?v=' . filemtime($rvb_dir . 'data.json')); ?>"></rent-vs-buy>
			<script src="<?php echo esc_url(content_url('rvb-test/rent-vs-buy.js') . '?v=' . filemtime($rvb_dir . 'rent-vs-buy.js')); ?>"></script>
		<?php else : ?>
			<p>The calculator is temporarily unavailable. Please try again later.</p>
		<?php endif; ?>
	</div>
	<ul class="mx-rvb-facts"><li>Prices and rents from Dubai Land Department registrations</li><li>Deposit, rate and term you can change</li><li>Purchase fees and insurance included</li></ul>
</div></section>
<section class="mx-section"><div class="mx-container">
	<div class="mx-section-head"><div><span class="mx-kicker">READING THE RESULT</span><h2>Three numbers.<br><em>One clearer picture.</em></h2></div><p>The estimate is a starting point for your own plans, not a recommendation to rent or to buy.</p></div>
	<div class="mx-guide-points mx-guide-points-three">
		<div><h3>Rent and payment</h3><p>The mortgage payment includes interest, repayment, and property and life insurance. Service charges and maintenance are not included.</p></div>
		<div><h3>Cash at the start</h3><p>Your deposit plus the DLD transfer fee, agent commission, and mortgage registration, bank, trustee and valuation fees.</p></div>
		<div><h3>Where prices come from</h3><p>Median prices and rents for ready apartments from Dubai Land Department registrations over six months. A specific property can differ.</p></div>
	</div>
</div></section>
<section class="mx-agent-strip"><div class="mx-container"><div><span class="mx-kicker mx-kicker-light">NEXT STEP</span><h2>Thinking about buying?<br><em>Get a fuller mortgage estimate.</em></h2></div><a class="mx-button mx-button-light" href="<?php echo esc_url(home_url('/')); ?>#calculator">Use the Mortgage Calculator <span aria-hidden="true">↗</span></a></div></section>
</main>
<?php get_footer('public'); ?>
