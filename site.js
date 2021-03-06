// A lot of this stuff is obsolete. Changed to generating static sites instead of ajax abomination.

var getQueryVar= function(name)
{
	var q= window.location.search.substring(1);
	var vars= q.split("&");
	for (var i= 0; i < vars.length; ++i) {
		var p= vars[i].split("=");
		if (p[0] == name)
			return p[1];
	}
	return undefined;
}

var urlPath= function(path)
{
	var url_path= "/?path=";
	for (var i= 0; i < path.length; ++i) {
		url_path += path[i];
		url_path += "/";
	}
	return url_path;
};

var pathLink= function(path, name)
{
	var arg= "[";
	for (var i= 0; i < path.length; ++i) {
		arg += "'" + path[i] + "',";
	}
	arg += "]";

	code= 	"<a href=\"" +
			urlPath(path) +
			"\" onclick=\"gotoPath(" +
			arg +
			", true); return false;\">" +
			name +
			"</a>";
	return code;
};

var dateDiv= function(date)
{
	return	"<div class=\"date\">" +
			date[0] + "-" + date[1] + "-" + date[2] +
			"</div>";
};

// e.g. ["games", "some_entry"]
var g_path= [];
var g_entriesByTitle= {};
var g_default_tag= "all";

var changeContent= function(path, code, make_history)
{
	g_path= path;

	$("#content").hide();
	$("#content").html(code);
	$("#content").fadeIn();

	/*
	var page_title= "crafn.kapsi.fi";
	var heading_code= pathLink([g_default_tag], "crafn.kapsi.fi//");
	for (var i= 0; i < g_path.length; ++i) {
		slashes= "//";
		if (i == g_path.length - 1 && i >= 1)
			slashes= "";
		partial_path= g_path.slice(0, i + 1);
		heading_code += pathLink(partial_path, g_path[i] + slashes);

		page_title += " - " + g_path[i];
	}
	$("#header").html(heading_code);
	document.title= page_title;

	if (make_history) {
		window.history.pushState({path: g_path}, "", urlPath(g_path));
	}
	*/

	// Image functionality
	var imgs= document.querySelectorAll('img');
	var img_id= 0;
	$("#content img").each(function()
	{
		var $img= $(this);
		$img.tabIndex= 10000;
		$img.attr("id", "image_" + img_id);
		$img.attr("onMouseDown", "onMouseDown_thumb(event," + img_id + ");");
		++img_id;
	});
};

var onMouseDown_html= function(e)
{
	// Demagnify every image
	$("#content img").each(function()
	{ $(this).attr("class", ""); });
};

var onMouseDown_thumb= function(e, id)
{
	var $image= $("#image_" + id);
	if (e.which == 1) { // lmb
		$("#content img").each(function()
		{
			if ($(this).attr("id") == $image.attr("id"))
				$image.toggleClass("magnify");
			else
				$(this).attr("class", "");
		});
	} else if (e.which == 2) { // mmb
		window.open($image.attr("src"), "_blank");
	}

	e.stopPropagation();
};

var selectTag= function(tag)
{ gotoPath([ tag ], true); };

var selectEntry= function(title)
{ gotoPath(g_path.concat(title), true); };

var gotoPath= function(path, make_history)
{
	if (path.length >= 2) { // Show entry
		var title= path[1];
		var entry= g_entriesByTitle[title];

		$.get("content/" + entry.file, function(md) {
			changeContent(
				path,
				dateDiv(entry.date) + marked(md),
				make_history);
		});
	} else if (path.length == 1) { // Show entries matching to tags
		/*
		var tag= path[0];
		var entries= [];
		var entry_ids= [];
		for (var i= 0; i < g_entries.length; ++i) {
			if ($.inArray(tag, g_entries[i].tags) != -1) {
				entries.push(g_entries[i]);
				entry_ids.push(i);
			}
		}

		// Entries to content
		var code= "";
		for (var i= 0; i < entries.length; ++i) {
			code += "<a class=\"blocklink\"" +
					"href=\"\"" +
					"onclick=\"selectEntry('" + entries[i].title + "');" +
					"return false;\">";
			code += "<h3>" + entries[i].title + "</h3>";
			code += dateDiv(entries[i].date);
			var text_id= "entry_text" + i;
			code += "<div class=\"preview\" id=\"" + text_id + "\"></div>";

			var get_path= "content/" + entries[i].file;
			$.get(get_path, function (id) { return function(md) {
				var max= 400;
				portion= md.substring(0, max);
				for (var k= 0; k < portion.length; ++k) {
					if (portion[k] == "\n" && portion[k + 1] == "\n") {
						portion= md.substring(0, k);
						break;
					}
				}

				if (md.length >= portion.length)
					portion += "...";

				$("#" + id).html(marked(portion));
			}}(text_id));
			code += "</a>";
		}
		changeContent(path, code, make_history);
		*/
	}
};

var onSiteLoad= function()
{
	/*
	$.ajaxSetup({beforeSend: function(xhr){
		if (xhr.overrideMimeType){
			xhr.overrideMimeType("text/plain");
		}
	}
	});
	*/

	// Back-button functionality
	/*
	window.onpopstate = function(e){
	    if(e.state)
			gotoPath(e.state.path, false);
	};
	*/

	// Create list of tags
	/*var tag_counts= {}
	for (var i= 0; i < g_entries.length; ++i) {
		var entry= g_entries[i];
		for (var k= 0; k < entry.tags.length; ++k) {
			var tag= entry.tags[k];
			var count= tag_counts[tag] || 0;
			++count;
			tag_counts[tag]= count;
		}
	}
	var sortable_tags= [];
	for (var key in tag_counts) {
		if (tag_counts.hasOwnProperty(key))
			sortable_tags.push({count: tag_counts[key], name: key});
	}
	sortable_tags.sort(function(a, b) { return b.count - a.count; });
	var tags= []
	for (var i= 0; i < sortable_tags.length; ++i) {
		tags.push(sortable_tags[i].name);
	}

	// Cache useful stuff
	for (var i= 0; i < g_entries.length; ++i) {
		var e= g_entries[i];
		e.title= e.file.split(".")[0];
		g_entriesByTitle[e.title]= e;
	}

	// Create navigation
	for (var i= 0; i < tags.length; ++i) {
		link_code= pathLink([tags[i]], tags[i]) + "</br>";
		$("#nav").append(link_code);
	}

	// Default content
	var path_var= getQueryVar("path");
	if (path_var== undefined) {
		selectTag(g_default_tag);
	} else {
		path= path_var.split("/");
		if (path[path.length - 1].length == 0)
			path.splice(path.length - 1, 1);
		gotoPath(path, true);
	}
	*/

	$('html').mousedown(function()
	{ onMouseDown_html(); });
};
window.onload= onSiteLoad;
