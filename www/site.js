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

var changeContent= function(title, code)
{
	$("#content").hide();
	$("#content").html(code);
	$("#content").fadeIn();

	$("#header").html("crafn.kapsi.fi/" + title);
};

var selectTag= function(tag)
{
	var entries= [];
	for (var i= 0; i < g_entries.length; ++i) {
		if ($.inArray(tag, g_entries[i].tags) != -1)
			entries.push(g_entries[i]);
	}

	var code= "";
	for (var i= 0; i < entries.length; ++i) {
		code += "<h3>" + entries[i].title + "</h3>";
	}
	changeContent(tag, code);
};

var onSiteLoad= function()
{
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

	// Create navigation
	for (var i= 0; i < tags.length; ++i) {
		link_code= "<a href=\"\" onclick=\"selectTag('"
			+ tags[i] + "'); return false;\">"
			+ tags[i] + " &nbsp;||||</a></br>";
		$("#nav").append(link_code);
	}

	// Default content
	if (getQueryVar("tags") == undefined) {
		selectTag("news");
	}
};
window.onload= onSiteLoad;

