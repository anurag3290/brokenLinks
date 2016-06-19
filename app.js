var express = require('express');
var async = require('async');
var waterfall = require('async-waterfall');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


app.get('/checkUrl', function(req, res){

	url = "https://mixpanel.com/mobile-ab-testing/"

	request(url, function(error, response, html){
		if(!error){
			var brokenLinks = []
			var $ = cheerio.load(html);
			var domain = extractDomain(url)

			async.waterfall([
				function(callback) {
					// CHECKING ALL SCRIPTS
					var scriptArray = $('script').get()
					if(scriptArray.length){
						console.log('Broken Script Computing...')
						extractBrokenLink(scriptArray,domain,brokenLinks, function (err, result) {
								if(err) {
									callback(new Error("failed getting something:" + err,null));
								}
								callback(null, result);
						});
					}
					else{
						callback(null, brokenLinks)
					}
				},
				function(result, callback){
					// CHECKING IMAGES
					var imgArray = $('img').get()
					if(imgArray.length){
						console.log('Broken Images Computing...')
						extractBrokenLink(imgArray,domain,result, function (err, result) {
							if(err) {
								callback(new Error("failed getting something:" + err.message));
							}
							callback(null, result);
						});
					}
					else{
						callback(null, result)
					}
				},
				function(result, callback){
					// CHECKING ALL LINKS
					var linkArray = $('link').get()
					if(linkArray.length){
						console.log('Broken Links Computing...')
						extractBrokenLink(linkArray,domain,result, function (err, result) {
							if(err) {
								callback(new Error("failed getting something:" + err.message));
							}
							callback(null, result);
						});
					}
					else{
						callback(null, result)
					}
				},
				function(result, callback){
					// CHECKING ALL ANCHOR TAGS
					var anchorArray = $('a').get()
					if(anchorArray.length){
						console.log('Broken Anchor Tags Computing...')
						extractBrokenLink(anchorArray,domain,result, function (err, result) {
							if(err) {
								callback(new Error("failed getting something:" + err.message));
							}
							callback(null, result);
						});
					}
					else{
						callback(null, result)
					}
				},
			], function (err, result) {
				if(err){
					console.log(err)
					res.send(err)
					return;
				}
				if(result){

					console.log('Total Broken Links: ',result)
					console.log('OPEN THE BROWSER !!')
					res.send(result);
					return;
				}
			});
		}
		else{
			console.log(error)
			res.send("Invalid URL") 
			return;
		}
	})
})


// Check response for the link
var requestFunction = function(url, callback) {
	 request(url, function(error, response){
			 if(error){
					 callback(error, null)
			 }
			 else{
					 callback(null, response.statusCode)
			 }
	 })
};

// Extract every possible link in the html
var extractBrokenLink = function(linkArray, domain, brokenLinks, callback){
	var lengthArray = linkArray.length
	console.log('No. of total attributes:', lengthArray)
	var ctr = 1
	for(i=0; i< lengthArray; i++){
		(function(x){
			if(linkArray[x].attribs && (linkArray[x].attribs.href || linkArray[x].attribs.src)){
				
				var tempUrl = linkArray[x].attribs.href || linkArray[x].attribs.src
				if (tempUrl.indexOf("://") == -1) {
					tempUrl = domain+tempUrl
				}
				requestFunction(tempUrl , function(err,res){
					ctr = ctr + 1
					if(err){
						console.log('Checking link '+x+' of '+lengthArray+' attributes')
						if(ctr == lengthArray){
							callback(error, null)
						}
					}
					else{
						console.log('Checking link '+x+' of '+lengthArray+' attributes')
						if(res && res!= 200){
							if(brokenLinks.indexOf(tempUrl)<0){
								brokenLinks.push(tempUrl)
							}
						}
						if(ctr == lengthArray){
							callback(null, brokenLinks)
						}
					}
			 })
			}
			else{
				ctr = ctr + 1
				if(ctr == lengthArray){
					callback(null, brokenLinks)
				}
			}
		}(i))
	}
}

// Compute domain from url
function extractDomain(url) {
		var domain;
		if (url.indexOf("://") > -1) {
			domain = url.split('/')[2];
			domain = domain.split(':')[0];
			domain = url.split('/')[0]+"//"+domain;
		}
		else {
			domain = url.split('/')[0];
			domain = domain.split(':')[0];
		}
		return domain
}

app.listen('3000');
console.log('Broken Links Computing...')
console.log("Open 'localhost:3000/checkUrl/' on browser")
exports = module.exports = app;