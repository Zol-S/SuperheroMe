$(document).ready(function() {
    $("#submit_button").click(function() {
    	$('#error_message').text('');
    	$('.ajax_loader').show();

		$.ajax({
			type: "POST",
			url: "/submit_form",
			data: {data: $("#data_text").val()},
			dataType: 'json'
		}).done(function (data) {
			$('.ajax_loader').hide();

			switch (data.error_code) {
				case 200:
						controller.scrollTo("#result_header", function (newScrollPos, callback) {
   							$(this).animate({scrollTop: newScrollPos}, 2000, "ease-in-out", callback);
						});

						$('#pow').removeClass('initial_hide');
						$('#result_text').html('WOW it seems like <strong>' + data.result[0].actor + '</strong> from <strong>' + data.result[0].imdb_title + '</strong> movie is the superhero inside you!');
					break;
				case 400:
						$('#error_message').text('The text is too short');
					break;
			}
		}); 
	});
});