//var headingFilter= function(str)
//{
//	return str.toLowerCase().replace(/ |'/g, "_");
//};

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

// e.g. ["games", "some_entry"]
var g_path= [];
var g_entriesByTitle= {};

var changeContent= function(path, code, make_history= true)
{
	$("#content").hide();
	$("#content").html(code);
	$("#content").fadeIn();

	g_path= path;

	new_path_str= "crafn.kapsi.fi";
	for (var i= 0; i < g_path.length; ++i)
		new_path_str += "//" + g_path[i];

	url_path= "/?path=";
	for (var i= 0; i < g_path.length; ++i) {
		url_path += g_path[i];
		url_path += "/";
	}

	if (make_history)
		window.history.pushState({path: g_path}, "", url_path);

	$("#header").html(new_path_str);
};

var selectTag= function(tag, make_history= true)
{
	gotoPath([ tag ], make_history);
};

var selectEntry= function(title, make_history= true)
{
	gotoPath(g_path.concat(title), make_history);
};

var gotoPath= function(path, make_history= true)
{
	if (path.length >= 2) {
		// Show entry
		var title= path[1];
		var entry= g_entriesByTitle[title];
		/// @todo Could be cached
		$.get("content/" + entry.file, function(md) {
			changeContent(
				path,
				marked(md),
				make_history);
		});
	} else if (path.length == 1) {
		// Show entries matching to tags
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
			var text_id= "entry_text" + i;
			code += "<div class=\"preview\" id=\"" + text_id + "\"></div>";

			var get_path= "content/" + entries[i].file;
			$.get(get_path, function (id) { return function(md) {
				var max= 300;
				portion= md.substring(0, max);
				if (md.length >= max)
					portion += "...";
				$("#" + id).html(marked(portion));
			}}(text_id));
			code += "</a>";
		}
		changeContent(path, code, make_history);
	}
};

var onSiteLoad= function()
{
	$.ajaxSetup({beforeSend: function(xhr){
		if (xhr.overrideMimeType){
			xhr.overrideMimeType("text/plain");
		}
	}
	});

	// Back-button functionality
	window.onpopstate = function(e){
	    if(e.state)
			gotoPath(e.state.path, false);
	};

	// Create list of tags
	var tag_counts= {}
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
			sortable_tags.push([tag_counts[key], key]);
	}
	sortable_tags.sort();
	var tags= []
	for (var i= 0; i < sortable_tags.length; ++i) {
		tags.push(sortable_tags[sortable_tags.length - i - 1][1]);
	}

	// Fill g_entriesByTitle
	for (var i= 0; i < g_entries.length; ++i) {
		var e= g_entries[i];
		g_entriesByTitle[e.title]= e;
	}

	// Create navigation
	for (var i= 0; i < tags.length; ++i) {
		link_code= "<a href=\"\" onclick=\"selectTag('"
			+ tags[i] + "'); return false;\">"
			+ tags[i] + " &nbsp;||||</a></br>";
		$("#nav").append(link_code);
	}

	// Default content
	var path_var= getQueryVar("path");
	if (path_var== undefined) {
		selectTag("news");
	} else {
		path= path_var.split("/");
		if (path[path.length - 1].length == 0)
			path.splice(path.length - 1, 1);
		gotoPath(path);
	}
};
window.onload= onSiteLoad;

