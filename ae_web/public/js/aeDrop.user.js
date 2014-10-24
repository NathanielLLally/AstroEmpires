// ==UserScript==
// @name        aeDrop
// @namespace   aE
// @include     *.astroempires.com/*
// @exclude     *.astroempires.com/login.aspx
// @exclude     *.astroempires.com/home.aspx
// @version     1
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js
// @grant       GM_xmlhttpRequest
// @grant       GM_log
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==

console.log("loading gmDrop");


var dropSiteURL = "http://cirrus.airitechsecurity.com/ae/gmDrop";
if (document.location.href.match(/(.+?)astroempires.com/)) {
  var server = document.location.href.match(/\/(.+?).astroempires.com/) [1]
  server = server.replace(/\//, '')
  var serverurl = 'http://' + server + '.astroempires.com/'
  var playerID = document.getElementById('account').parentNode.getElementsByTagName("th")[1].innerHTML;
  var serverTime = document.getElementById('server-time').getAttribute('title');
}

var aeData = { 
  "server": server,
  "time": serverTime,
  "player": playerID,
  "fleet": [],
  "base": [],
  "astro": [],
};

function sendToServer(url, data) {

  var postData = JSON.stringify(data);

    console.log("posting to "+url+": "+postData);

    GM_xmlhttpRequest({
      method: "POST",
      url: url,
      data: postData,
      headers: {
        "Content-Type": "application/json"
      },
      ontimeout: function(response) {
          console.log("ontimeout :" + response);
      },
      onerror: function(response) {
          console.log("onerror :" + response);
      },
      onload: function(response) {
          console.log("onload :" + response);
        if (response.status == 200) {
          console.log("sahksess");
          var jsonResponse = JSON.parse(response.responseText);
          console.log("got json status from server: "+jsonResponse.test);
        } else {
          console.log("hmm");
          console.log(response.status);
        }

      }
    });

}

function replaceTime()
{
	  for(n=1;n<=500;n++)
	  {
		elem=document.getElementById('timer'+n);
	    if (!elem)
	    {
	       break;
	    }
	    elem.id = 'blah'+n;

	    s=elem.title;
	    var newElement, endTime;
	    var d = new Date();
	    var now = new Date();
	    if (elem)
	    {
	       if(s<=0)
	       {
		 endTime="-"
	       }
	       else
	       {
		 d.setTime(d.getTime()+(s*1000));
		 tempdate = new Date();
		 tempdate.setDate(tempdate.getDate()+1)
		 if(now.toLocaleDateString() == d.toLocaleDateString() )
		 {
		    endTime="Today @ "+d.formatDate('H:i:s');
		 }
		 else if(tempdate.toLocaleDateString() == d.toLocaleDateString())
		 {
		    endTime="Tomorrow @ "+d.formatDate('H:i:s');
		 }
		 else
		 {
		    endTime=d.formatDate('D jS M @ H:i:s');
		 }
	       }
	       elem.innerHTML = "<b><span id='timer"+n+"' title='"+ s +"'>-</span></b><br><nobr><span id='done"+n+"' style='font-size: xx-small; color: "+getAgeCol(s)+"'>" + endTime + "</span></nobr>"
	    }
	  }
};

  // formatDate :
// a PHP date like function, for formatting date strings
// authored by Svend Tofte <www.svendtofte.com>
// the code is in the public domain
//
// see http://www.svendtofte.com/javascript/javascript-date-string-formatting/
// and http://www.php.net/date
//
// thanks to
//  - Daniel Berlin <mail@daniel-berlin.de>,
//    major overhaul and improvements
//  - Matt Bannon,
//    correcting some stupid bugs in my days-in-the-months list!
//  - levon ghazaryan. pointing out an error in z switch.
//  - Andy Pemberton. pointing out error in c switch
//
// input : format string
// time : epoch time (seconds, and optional)
//
// if time is not passed, formatting is based on
// the current "this" date object's set time.
//
// supported switches are
// a, A, B, c, d, D, F, g, G, h, H, i, I (uppercase i), j, l (lowecase L),
// L, m, M, n, N, O, P, r, s, S, t, U, w, W, y, Y, z, Z
//
// unsupported (as compared to date in PHP 5.1.3)
// T, e, o

Date.prototype.formatDate = function (input,time) {

    var daysLong =    ["Sunday", "Monday", "Tuesday", "Wednesday",
                       "Thursday", "Friday", "Saturday"];
    var daysShort =   ["Sun", "Mon", "Tue", "Wed",
                       "Thu", "Fri", "Sat"];
    var monthsShort = ["Jan", "Feb", "Mar", "Apr",
                       "May", "Jun", "Jul", "Aug", "Sep",
                       "Oct", "Nov", "Dec"];
    var monthsLong =  ["January", "February", "March", "April",
                       "May", "June", "July", "August", "September",
                       "October", "November", "December"];

    var switches = { // switches object

        a : function () {
            // Lowercase Ante meridiem and Post meridiem
            return date.getHours() > 11? "pm" : "am";
        },

        A : function () {
            // Uppercase Ante meridiem and Post meridiem
            return (this.a().toUpperCase ());
        },

        B : function (){
            // Swatch internet time. code simply grabbed from ppk,
            // since I was feeling lazy:
            // http://www.xs4all.nl/~ppk/js/beat.html
            var off = (date.getTimezoneOffset() + 60)*60;
            var theSeconds = (date.getHours() * 3600) +
                             (date.getMinutes() * 60) +
                              date.getSeconds() + off;
            var beat = Math.floor(theSeconds/86.4);
            if (beat > 1000) beat -= 1000;
            if (beat < 0) beat += 1000;
            if ((String(beat)).length == 1) beat = "00"+beat;
            if ((String(beat)).length == 2) beat = "0"+beat;
            return beat;
        },

        c : function () {
            // ISO 8601 date (e.g.: "2004-02-12T15:19:21+00:00"), as per
            // http://www.cl.cam.ac.uk/~mgk25/iso-time.html
            return (this.Y() + "-" + this.m() + "-" + this.d() + "T" +
                    this.H() + ":" + this.i() + ":" + this.s() + this.P());
        },

        d : function () {
            // Day of the month, 2 digits with leading zeros
            var j = String(this.j());
            return (j.length == 1 ? "0"+j : j);
        },

        D : function () {
            // A textual representation of a day, three letters
            return daysShort[date.getDay()];
        },

        F : function () {
            // A full textual representation of a month
            return monthsLong[date.getMonth()];
        },

        g : function () {
           // 12-hour format of an hour without leading zeros, 1 through 12!
           if (date.getHours() == 0) {
               return 12;
           } else {
               return date.getHours()>12 ? date.getHours()-12 : date.getHours();
           }
       },

        G : function () {
            // 24-hour format of an hour without leading zeros
            return date.getHours();
        },

        h : function () {
            // 12-hour format of an hour with leading zeros
            var g = String(this.g());
            return (g.length == 1 ? "0"+g : g);
        },

        H : function () {
            // 24-hour format of an hour with leading zeros
            var G = String(this.G());
            return (G.length == 1 ? "0"+G : G);
        },

        i : function () {
            // Minutes with leading zeros
            var min = String (date.getMinutes ());
            return (min.length == 1 ? "0" + min : min);
        },

        I : function () {
            // Whether or not the date is in daylight saving time (DST)
            // note that this has no bearing in actual DST mechanics,
            // and is just a pure guess. buyer beware.
            var noDST = new Date ("January 1 " + this.Y() + " 00:00:00");
            return (noDST.getTimezoneOffset () ==
                    date.getTimezoneOffset () ? 0 : 1);
        },

        j : function () {
            // Day of the month without leading zeros
            return date.getDate();
        },

        l : function () {
            // A full textual representation of the day of the week
            return daysLong[date.getDay()];
        },

        L : function () {
            // leap year or not. 1 if leap year, 0 if not.
            // the logic should match iso's 8601 standard.
            // http://www.uic.edu/depts/accc/software/isodates/leapyear.html
            var Y = this.Y();
            if (
                (Y % 4 == 0 && Y % 100 != 0) ||
                (Y % 4 == 0 && Y % 100 == 0 && Y % 400 == 0)
                ) {
                return 1;
            } else {
                return 0;
            }
        },

        m : function () {
            // Numeric representation of a month, with leading zeros
            var n = String(this.n());
            return (n.length == 1 ? "0"+n : n);
        },

        M : function () {
            // A short textual representation of a month, three letters
            return monthsShort[date.getMonth()];
        },

        n : function () {
            // Numeric representation of a month, without leading zeros
            return date.getMonth()+1;
        },

        N : function () {
            // ISO-8601 numeric representation of the day of the week
            var w = this.w();
            return (w == 0 ? 7 : w);
        },

        O : function () {
            // Difference to Greenwich time (GMT) in hours
            var os = Math.abs(date.getTimezoneOffset());
            var h = String(Math.floor(os/60));
            var m = String(os%60);
            h.length == 1? h = "0"+h:1;
            m.length == 1? m = "0"+m:1;
            return date.getTimezoneOffset() < 0 ? "+"+h+m : "-"+h+m;
        },

        P : function () {
            // Difference to GMT, with colon between hours and minutes
            var O = this.O();
            return (O.substr(0, 3) + ":" + O.substr(3, 2));
        },

        r : function () {
            // RFC 822 formatted date
            var r; // result
            //  Thu         ,     21               Dec              2000
            r = this.D() + ", " + this.d() + " " + this.M() + " " + this.Y() +
            //    16          :    01          :    07               0200
            " " + this.H() + ":" + this.i() + ":" + this.s() + " " + this.O();
            return r;
        },

        s : function () {
            // Seconds, with leading zeros
            var sec = String (date.getSeconds ());
            return (sec.length == 1 ? "0" + sec : sec);
        },

        S : function () {
            // English ordinal suffix for the day of the month, 2 characters
            switch (date.getDate ()) {
                case  1: return ("st");
                case  2: return ("nd");
                case  3: return ("rd");
                case 21: return ("st");
                case 22: return ("nd");
                case 23: return ("rd");
                case 31: return ("st");
                default: return ("th");
            }
        },

        t : function () {
            // thanks to Matt Bannon for some much needed code-fixes here!
            var daysinmonths = [null,31,28,31,30,31,30,31,31,30,31,30,31];
            if (this.L()==1 && this.n()==2) return 29; // ~leap day
            return daysinmonths[this.n()];
        },

        U : function () {
            // Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)
            return Math.round(date.getTime()/1000);
        },

        w : function () {
            // Numeric representation of the day of the week
            return date.getDay();
        },

        W : function () {
            // Weeknumber, as per ISO specification:
            // http://www.cl.cam.ac.uk/~mgk25/iso-time.html

            var DoW = this.N ();
            var DoY = this.z ();

            // If the day is 3 days before New Year's Eve and is Thursday or earlier,
            // it's week 1 of next year.
            var daysToNY = 364 + this.L () - DoY;
            if (daysToNY <= 2 && DoW <= (3 - daysToNY)) {
                return 1;
            }

            // If the day is within 3 days after New Year's Eve and is Friday or later,
            // it belongs to the old year.
            if (DoY <= 2 && DoW >= 5) {
                return new Date (this.Y () - 1, 11, 31).formatDate ("W");
            }

            var nyDoW = new Date (this.Y (), 0, 1).getDay ();
            nyDoW = nyDoW != 0 ? nyDoW - 1 : 6;

            if (nyDoW <= 3) { // First day of the year is a Thursday or earlier
                return (1 + Math.floor ((DoY + nyDoW) / 7));
            } else {  // First day of the year is a Friday or later
                return (1 + Math.floor ((DoY - (7 - nyDoW)) / 7));
            }
        },

        y : function () {
            // A two-digit representation of a year
            var y = String(this.Y());
            return y.substring(y.length-2,y.length);
        },

        Y : function () {
            // A full numeric representation of a year, 4 digits

            // we first check, if getFullYear is supported. if it
            // is, we just use that. ppks code is nice, but wont
            // work with dates outside 1900-2038, or something like that
            if (date.getFullYear) {
                var newDate = new Date("January 1 2001 00:00:00 +0000");
                var x = newDate .getFullYear();
                if (x == 2001) {
                    // i trust the method now
                    return date.getFullYear();
                }
            }
            // else, do this:
            // codes thanks to ppk:
            // http://www.xs4all.nl/~ppk/js/introdate.html
            var x = date.getYear();
            var y = x % 100;
            y += (y < 38) ? 2000 : 1900;
            return y;
        },


        z : function () {
            // The day of the year, zero indexed! 0 through 366
            var s = "January 1 " + this.Y() + " 00:00:00 GMT" + this.O();
            var t = new Date(s);
            var diff = date.getTime() - t.getTime();
            return Math.floor(diff/1000/60/60/24);
        },

        Z : function () {
            // Timezone offset in seconds
            return (date.getTimezoneOffset () * -60);
        }

    }

    function getSwitch(str) {
        if (switches[str] != undefined) {
            return switches[str]();
        } else {
            return str;
        }
    }

    var date;
    if (time) {
        var date = new Date (time);
    } else {
        var date = this;
    }

    var formatString = input.split("");
    var i = 0;
    while (i < formatString.length) {
        if (formatString[i] == "%") {
            // this is our way of allowing users to escape stuff
            formatString.splice(i,1);
        } else {
            formatString[i] = getSwitch(formatString[i]);
        }
        i++;
    }

    return formatString.join("");
}


// Some (not all) predefined format strings from PHP 5.1.1, which
// offer standard date representations.
// See: http://www.php.net/manual/en/ref.datetime.php#datetime.constants
//

// Atom      "2005-08-15T15:52:01+00:00"
Date.DATE_ATOM    = "Y-m-d%TH:i:sP";
// ISO-8601  "2005-08-15T15:52:01+0000"
Date.DATE_ISO8601 = "Y-m-d%TH:i:sO";
// RFC 2822  "Mon, 15 Aug 2005 15:52:01 +0000"
Date.DATE_RFC2822 = "D, d M Y H:i:s O";
// W3C       "2005-08-15 15:52:01+00:00"
Date.DATE_W3C     = "Y-m-d%TH:i:sP";


function getAgeCol(age) {
		var col = '#461B7E'; // 72 hours +
		if (age <= 3600)
			col = '#FFFFFF'; // 1 hour
		else if (age <=10800)
			col = '#FFFFFF'; // 3 hours
		else if (age <=21600)
			col = '#9E7BFF'; // 6 hours
		else if (age <=43200)
			col = '#9172EC'; // 12 hours
		else if (age <=86400)
			col = '#8467D7'; // 24 hours
		else if (age <=172800)
			col = '#7A5DC7'; // 48 hours
		else if (age <=259200)
			col = '#461B7E'; // 72 hours
		return col;
}

function xml2string(node) {
   if (typeof(XMLSerializer) !== 'undefined') {
      var serializer = new XMLSerializer();
      return serializer.serializeToString(node);
   } else if (node.xml) {
      return node.xml;
   }
}

function parseMapFleet(table, location) {
    
//    console.log(xml2string(table));
    
    var tr = table.getElementsByTagName('tr');
  
  //aeData['fleet'] = [];
  //console.log(tr.length);
    
  for(r=0; r<tr.length; r++){
    var dtRow = {};
    
    var td = tr[r].getElementsByTagName('td');
      
      
  for(i=0; i<td.length; i++){
    var sortKey = td[i].getAttribute("sorttable_customkey");
      
//      console.log("r "+r+" i " + i + " sk " + sortKey);
    if (null !== sortKey) {
    if (sortKey.match(/Fleet/)) {
      var a = td[i].getElementsByTagName('a')[0];
      
      dtRow['id'] = a.getAttribute("href");
      dtRow['name'] = a.innerHTML;

    } else if (sortKey.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
      dtRow['destination'] = sortKey;
    } else if (td[i].getAttribute("sorttable_customkey").match(/\d+/)) {
      if (td[i].getAttribute("title") == sortKey) {
        dtRow['arrival'] = sortKey;
      } else {
        dtRow['size'] = sortKey;
      }

    } else {
      dtRow['player'] = {};
      dtRow['player']['name'] = sortKey;
      dtRow['player']['id'] = td[i].getElementsByTagName('a')[0].getAttribute("href");
    }
    }
  }
    if (dtRow['arrival'] == null) {
        dtRow['location'] = location;
    }
    if (dtRow['arrival'] != null && dtRow['destination'] == null) {
        dtRow['destination'] = location;
    }
    if (Object.keys(dtRow).length > 0) {
      aeData['fleet'].push(dtRow);
    }

  }

}

function parseScanner(){
  
  //console.log(xml2string(document.getElementById('coded_scanners')));
   
  parseMapFleet(document.getElementById('coded_scanners'));
    
}


function parseFleet() {

  var dtRow = {};
  
  var tables = document.getElementsByTagName('table');
  var playerAndLoc;
  for (i=0; i<tables.length; i++) {
   if (tables[i].id == "fleet_overview") {
     playerAndLoc = tables[i-1];
   }
  }
  //console.log(xml2string(playerAndLoc));
  
  if (playerAndLoc.getElementsByTagName('form').length > 0) {
    return;
  }
  var links = playerAndLoc.getElementsByTagName('a');
  dtRow['player'] = {};
  dtRow['player']['id'] = links[0].getAttribute("href");
  dtRow['player']['name'] = links[0].textContent;
  dtRow['location'] = links[1].getAttribute("href");
  
  //console.log(xml2string(document.getElementById('fleet_overview')));
  
  dtRow['id'] = document.location.href.match(/fleet.aspx\?fleet=\d+/)[0];
  
  var fleetTable = document.getElementById('fleet_overview').getElementsByTagName('table')[0];
  var tr = fleetTable.getElementsByTagName('tr');
  for(r=0; r<tr.length; r++){
    var td = tr[r].getElementsByTagName('td');
    if (td.length > 0) {
     dtRow[td[0].textContent] = td[1].textContent;
   }
  }
  
  var fleetSize = document.getElementById('fleet_overview').getElementsByTagName('center')[0].textContent;
  dtRow['size'] = fleetSize.match(/(\d+)/g).join("");
  
  
  aeData['fleet'].push(dtRow);
}

function parseAstro() {

  var dtRow = {};
  var el = document.getElementsByClassName('astro')[0];
  var location = document.location.href.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];
  
   console.log(el.textContent);
   dtRow['type'] = el.textContent.match(/(Astro Type: (.*?)Terrain)/)[2];
   dtRow['terrain'] = el.textContent.match(/(Terrain: (.*?)Area)/)[2];
   dtRow['location'] = location;
  
   aeData['astro'].push(dtRow);
    
  var table = document.getElementById('map_base');    
  dtRow = {};
  if (table !== null) {
     
     console.log(xml2string(table));
      
      var rows = table.getElementsByTagName('table')[0].getElementsByTagName('tr');
             //console.log("hmm" + rows.length);
     for(r=0; r<rows.length; r++){
         var col = rows[r].getElementsByTagName('td');
         if (col != null && col.length > 0) {
             
         var i = 0;
             
         var link = col[i++].getElementsByTagName('a')[0];
         dtRow['name'] = link.textContent;
         dtRow['id'] = link.getAttribute('href');
         
         link = col[i++].getElementsByTagName('a')[0];
         dtRow['owner'] = {};
         dtRow['owner']['name'] = link.textContent;
         dtRow['owner']['id'] = link.getAttribute('href');
         
          link = col[i++].getElementsByTagName('a')[0];
             if (link != null) {
         dtRow['occupier'] = {};
         dtRow['occupier']['name'] = link.textContent;
         dtRow['occupier']['id'] = link.getAttribute('href');
             }
         
         link = col[i].getElementsByTagName('a')[0];
         dtRow['economy'] = link.textContent;
         }
         
     }
     
      aeData['base'].push(dtRow);
  }
    
  var mapfleet = document.getElementById('map_fleets');
  if (mapfleet != null) {
     parseMapFleet(mapfleet.getElementsByTagName('table')[0], location);    
  }
}

function parseSystem() {
  var astroRow = {};
  var baseRow = {};
  var fleetRow = {};
  var table = document.getElementsByClassName('system')[0];

  var daysOld;
  var center = document.getElementsByTagName('center');
  for (i = 0; i < center.length; i++) {
    //console.log(center[i].textContent)
    if (center[i].textContent.match(/Recorded data from (\d+)/)) {
      console.log('ok');
      daysOld = center[i].textContent.match(/Recorded data from (\d+)/)[1];
    }
  }

//  console.log(xml2string(table));

  var links = table.getElementsByTagName('a');

  for (li = 0; li < links.length; li++) {
    var link = links[li];
//    console.log(link.getAttribute('href'));
    var img = link.getElementsByTagName('img')[0];

    if (img != null) {

      astroRow['terrain'] = img.getAttribute("alt");
      var iid = img.getAttribute("id");
      if (iid != null) {
        astroRow['location'] = iid.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];

        if (astroRow['location'].match(/0$/))
        {
          astroRow['type'] = "Planet";
        }
        if (astroRow['location'].match(/[1-4]$/))
        {
          astroRow['type'] = "Moon";
        }
        if (astroRow['terrain'] == "Asteroid Belt") {
          astroRow['type'] = "Asteroid Belt";
        }
        if (astroRow['terrain'] == "Gas Giant") {
          astroRow['type'] = "Gas Giant";
        }

        if (astroRow['terrain'].match(/^Asteroid$/)) {
          astroRow['type'] = "Asteroid";
        }

        //is it a base?
        if (link.getAttribute("href").match(/base\.aspx\?base=/)) {
          baseRow['id'] = link.getAttribute("href").match(/base\.aspx\?base=(\d+)/)[0];
          baseRow['location'] = astroRow['location'] ;
          var player = {};
        }

        //for astros with bases, the subsequent 1-3 divs will
        // hold player and fleet info
        var node = link.nextSibling;
        for (next = node; next != null && next.tagName !== "A"; next = next.nextSibling) {
          console.log("next tag: " + next.tagName);
          if (next.tagName == "DIV") {
            var a = next.getElementsByTagName('a');
            var div =  next.getElementsByTagName('div');
            if (a != null && a.length > 0) {
              if (Object.keys(player).length > 0) {
                baseRow['owner'] = player;
                player = {};
              }
              player['id'] = a[0].getAttribute("href");
              player['name'] = a[0].textContent;
              if (baseRow['owner'] != null) {
                baseRow['occupier'] = player;
              }
            }
            if (div != null && div.length > 0) {
              for (i = 0; i < div.length; i++) {
                var fleet = div[i].getAttribute("title");
                if (fleet != null) {
                  if (!(fleet.match(/Self/))) {
                    var nfo = fleet.match(/Fleet present: ([\d,]+) - Incoming: ([\d,])/);
                    if (nfo != null && nfo.length > 0) {
                      fleetRow['location'] = astroRow['location'];
                      fleetRow['size'] = nfo[1].match(/\d+/g).join("");
                      aeData['fleet'].push(fleetRow);
                      fleetRow = {};
                      var inc = nfo[2].match(/\d+/g).join("");
                      if (inc != "0") {
                        fleetRow['destination'] = astroRow['location'];
                        fleetRow['size'] = inc;
                        aeData['fleet'].push(fleetRow);
                        fleetRow = {};
                      }
                    }
                  }
                }
              }
//               console.log(JSON.stringify(aeData));

            }
          }
        }
        if (Object.keys(baseRow).length > 0) {
          if (baseRow['owner'] == null) {
            baseRow['owner'] = player;
          }

          aeData['base'].push(baseRow);
          baseRow = {};
        }

        if (daysOld != null) {
          astroRow['daysOld'] = daysOld;
        }
        aeData['astro'].push(astroRow);
        astroRow = {};
      }
    }
  }
}

function parseBase() {
  var baseRow = {};

  var tables = document.getElementsByTagName('table');
  if (tables != null && tables.length > 0) {
    for (i = 0; i < tables.length; i++) {
      console.log('table '+i);
      var table = tables[i];
      var rows = table.getElementsByTagName('tr');

/*
      if (rows.length > 1) {
      console.log("rows " + rows.length +
            " 0.cols " +rows[0].getElementsByTagName('th').length +
            " 1.cols " +rows[1].getElementsByTagName('td').length
            );
      }
      */

      if (rows != null && rows.length == 2) {
        var colsTH =  rows[0].getElementsByTagName('th');
        var colsTD =  rows[1].getElementsByTagName('td');

        if (colsTH.length == colsTD.length && colsTH.length == 6) {

          for (ih = 0; ih < colsTH.length; ih++) {
//            console.log(colsTH[ih].textContent  + " = " + colsTD[ih].textContent);
            var key = colsTH[ih].textContent;
            if (key == "Base Name") {
              baseRow['name'] = colsTD[ih];
            } else if (key == "Location") {
              baseRow['location'] = colsTD[ih];
            } else if (key == "Trade Routes") {
              baseRow['tradeRoutes'] = colsTD[ih];
            }
          }
        }
      }
    }
  }

  var tblCap = document.getElementById('base_processing-capacities').getElementsByTagName('table')[0];
  //console.log(xml2string(tblCap));

  var trs = tblCap.getElementsByTagName('tr');
  for (var i = 0; i < trs.length; i++) {
    var tr = trs[i];
    var tds = tr.getElementsByTagName('td');
    if (tds != null && tds.length > 0) {
      if (tds[0].textContent == "Base Owner") {
        var a = tds[1].getElementsByTagName('a');
        if (a != null && a.length > 0) {
          console.log(a[0].textContent);
          baseRow['owner'] = {};
          baseRow['owner']['id'] = a[0].getAttribute('href');
          baseRow['owner']['name'] = a[0].textContent;
        }
      } else if (tds[0].textContent == "Economy") {
        baseRow['economy'] = tds[1].textContent;
      } else if (tds[0].textContent == "Owner Income") {a
        if (tds[1].textContent != baseRow['economy']) {
          baseRow['ownerIncome'] = tds[1].textContent / baseRow['economy'] * 100;
        }
      }
    }
  }

  var tblFleets = document.getElementById('base_fleets').getElementsByTagName('table')[0];
  parseMapFleet(tblFleets);

  var tblStru = document.getElementById('base_resume-structures');
 
//  console.log(xml2string(tblStru));

  var struc = {};
  var trs = tblStru.getElementsByTagName('tr');
  for (i = 0; i < trs.length; i++) {
    var tds = trs[i].getElementsByTagName('td');
    if (tds != null && tds.length > 0) {
      var bld = tds[0];
      var bldVal = tds[0];
      var ccJg = tds[2];
      var ccJgVal = tds[3];
      if (ccJgVal != null && ccJgVal.textContent.match(/\d/)) {
        console.log( ccJgVal.innerHTML);
        var vals = ccJgVal.innerHTML.match(/(\d+)</g);
        baseRow['Command Centers'] = vals[0].match(/\d+/)[0];
        if (vals.length > 1) {
          baseRow['Jump Gate'] = vals[1].match(/\d+/)[0];
        }
      }
      var def = tds[4];
      var defVal = tds[5];
      var ds = {};
      if (def != null && defVal != null) {
        var name = def.getElementsByTagName('span');
        var val = defVal.getElementsByTagName('span');
        for (j = 0; j < name.length; j++) {
          if (name[j] != null && val[j] != null) {
            ds[name[j].textContent] = val[j].textContent;
          }
        }
      }
      if (Object.keys(ds).length > 0) {
        baseRow['defenses'] = ds;
      }
    }
  }
  
  aeData['base'].push(baseRow);
}

function parseEmpire()
{
  var baseRow = {};
  var table = document.getElementById('empire_events').getElementsByTagName('table')[0];
  var rows = table.getElementsByTagName('tr');
  for (i = 0; i < rows.length; i++) {
    var cols = rows[i].getElementsByTagName('td');
    if (cols != null and cols.length > 0) {
      var a = cols[0].getElementsByTagName('a')[0];
      baseRow['name'] = a.textContent;
      baseRow['location'] = a.href.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];
    }
  }

  console.log(baseRow['location']);
}

/********************************************************************************************************
*/

try {
  if (document.location.href.match(/astroempires\.com/)) {
    replaceTime();
    if (document.location.href.match(/view=scanners/)) { 
      parseScanner();

    } else if (document.location.href.match(/fleet\.aspx\?fleet=/)) {
      parseFleet();

    } else if (document.location.href.match(/base\.aspx\?base/)) {
      parseBase();

    } else if (document.location.href.match(/map\.aspx\?loc=[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
      parseAstro();

    } else if (document.location.href.match(/map\.aspx\?loc=[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
      parseSystem();

    } else if (document.location.href.match(/empire\.aspx/)) {

      parseEmpire();
    }

    console.log(JSON.stringify(aeData));
    if (aeData['fleet'].length > 0 || aeData['base'].length > 0 || aeData['astro'].length > 0) {
      sendToServer(dropSiteURL, aeData);
    }
    
  }
} catch(e) {
  console.log(e);
}

console.log("done");

