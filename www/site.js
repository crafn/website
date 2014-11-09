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

var genPathLink= function(path, name)
{
	var arg= "[";
	for (var i= 0; i < path.length; ++i) {
		arg += "'" + path[i] + "',";
	}
	arg += "]";

	code= 	"<a href=\"\" onclick=\"gotoPath(" +
			arg +
			", true); return false;\">" +
			name +
			"</a>";
	return code;
};

// e.g. ["games", "some_entry"]
var g_path= [];
var g_entriesByTitle= {};

var changeContent= function(path, code, make_history)
{
	g_path= path;

	$("#content").hide();
	$("#content").html(code);
	$("#content").fadeIn();

	heading_code= genPathLink(["news"], "crafn.kapsi.fi//");
	for (var i= 0; i < g_path.length; ++i) {
		slashes= "//";
		if (i == g_path.length + 1)
			slashes= "";
		partial_path= g_path.slice(0, i + 1);
		heading_code += genPathLink(partial_path, g_path[i] + slashes);
	}
	$("#header").html(heading_code);

	if (make_history) {
		url_path= "/?path=";
		for (var i= 0; i < g_path.length; ++i) {
			url_path += g_path[i];
			url_path += "/";
		}
		window.history.pushState({path: g_path}, "", url_path);
	}
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
		/// @todo Could be cached
		$.get("content/" + entry.file, function(md) {
			changeContent(
				path,
				marked(md),
				make_history);
		});
	} else if (path.length == 1) { // Show entries matching to tags
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

	// Cache useful stuff
	for (var i= 0; i < g_entries.length; ++i) {
		var e= g_entries[i];
		e.title= e.file.split(".")[0];
		g_entriesByTitle[e.title]= e;
	}

	// Create navigation
	for (var i= 0; i < tags.length; ++i) {
		link_code= genPathLink([tags[i]], tags[i] + " &nbsp;||||") + "</br>";
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
		gotoPath(path, true);
	}
};
window.onload= onSiteLoad;

