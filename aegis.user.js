// ==UserScript==
// @name        aegis
// @description Astro Empires Galaxy Information Service
// @namespace   http://cirrus.airitechsecurity.com
// @downloadURL http://cirrus.airitechsecurity.com/dev/js/aegis.user.js
// @resource    aegis.css    http://cirrus.airitechsecurity.com/dev/css/aegis.css
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js
// @require     http://cirrus.airitechsecurity.com/js/moment.min.js
// @require     http://cirrus.airitechsecurity.com/js/moment-duration-format.min.js
// @include     *.astroempires.com/*
// @exclude     *.astroempires.com/login.aspx*
// @exclude     *.astroempires.com/home.aspx
// @version     1.2
// @grant       GM_xmlhttpRequest
// @grant       GM_log
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_info
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_openInTab
// ==/UserScript==

/* TODO:
 *
 *  ctx have a constructor?
 *  Context.prototype.has = function
 *
 */

//boards ad
if (window.name == 'aswift_1') {
  return;
}

/* global variables filled by dispatch */
var aegis = this;
var server,serverURL,playerID,serverTime;
var mServerTime, mLocalStartTime;

var aegisURL = "http://cirrus.airitechsecurity.com/ae/";
var aegisURLstore = "gis/2.json";
var aegisURLquery = "gis/q.json";
var sendTimeout;

var ships = ['Fighters','Bombers','Heavy Bombers','Ion Bombers','Corvette','Recycler','Destroyer','Frigate','Ion Frigate','Scout Ship','Outpost Ship','Cruiser','Carrier','Heavy Cruiser','Battleship','Fleet Carrier','Dreadnought','Titan','Leviathan','Death Star'];

var shipAbbrev = ['ft','b','hb','ib','cv','rc','ds','fri','ifri','s','os','cru','car','hcru','bs','fcar','dred','tit','levi','death'];


var GmTimeFormat = "YYYY-MM-DD HH:mm:ss";
var version = GM_info.script.version;
console.log("running aegis v"+version+" grease monkey v"+GM_info.version);


/* attempt at creating a tab */
(this.setTabName = function() {
  if (window.document.location.href.match (/(.+?)astroempires.com/)) {
    if (!window.name.match(/^aegis/)) {
      var id = GM_getValue("aegisTabID", 0) + 1;
      window.name = "aegis"+id;
      GM_setValue("aegisTabID", id);
    }
  }
  console.log("tab name: "+window.name);
  console.log('next tabID:'+GM_getValue("aegisTabID", 0));
})();

function getTabID()
{
  var id = window.name;
  if (id.match(/^aegis(\d+)/)) {
    return id.match(/^aegis(\d+)/)[1];
  }
}

function checkForUpdate() 
{
  var plugin_url="http://cirrus.airitechsecurity.com/dev/js/aegis.user.js";
  if ((parseInt(GM_getValue('last_update', '0')) + 3600000 <= (new Date().getTime()))){
    GM_xmlhttpRequest( {
      method: 'GET',
      url: plugin_url,
      headers: {'Cache-Control': 'no-cache'},
      ignoreCache: true,
      onload: function(resp){
        var local_version, remote_version, rt, script_name;

        rt=resp.responseText;
        remote_version = parseFloat(/@version\s*(.*?)\s*$/m.exec(rt)[1]);
        local_version = parseFloat(version);

        script_name = (/@name\s*(.*?)\s*$/m.exec(rt))[1];

        if (remote_version > local_version){

          if(confirm('There is an update available for the Greasemonkey script ['+script_name+']\nWould you like to install it now?')){
            GM_openInTab(plugin_url);
          }
        }
        else{
          console.log('No update is available for "'+script_name+'"');
          consoleMsg('no new update for "'+script_name+'"');
        }
        GM_setValue('last_update', new Date().getTime()+'');
      }
    });
  } else {
    console.log('last updated ' + GM_getValue('last_update', '0'));
    //    consoleMsg('last update check ' + ( parseInt(((new Date().getTime()) - GM_getValue('last_update', '0')) / 1000)) + 's ago');
  }

}

/* this function should be called once at script load time
 * to see if a previous session had connection issues and send all the data 
 */
function checkSendBufferCache()
{
  var keys = GM_listValues();

  var key = keys[0];
  for (var i=0; key != null; key=keys[i++] ) {

    if(key.match(/^sendBuffer:(.*?):/)) {
      var route = key.match(/^sendBuffer:(.*?):(.*?):/)[1];
      var cbString = key.match(/^sendBuffer:(.*?):(.*?):/)[2];
      console.log('sendbuffer post route:' + route);
      var postData = GM_getValue(key);
      var data = JSON.parse(postData);
      GM_deleteValue(key);
      sendToServer(data, route, cbString);
    }
    /*
    if (key.match(/^starMap:/)) {
      GM_deleteValue(key);
    }
    if (key.match(/^sendQ:/)) {
      GM_deleteValue(key);
    }
    */
  }
}

function checkSend(hashKey)
{
  var postData = GM_getValue(hashKey);
//  GM_deleteValue(hashKey);
//  return;
  if (postData != null) {
    consoleMsg("<span class='panicMsg'>server connection timeout<br>please restart firefox</span>");
    var data = JSON.parse(postData);
    console.log(postData);
    var route = hashkey.match(/^sendBuffer:(.*?):/)[1];
    var cbString = hashkey.match(/^sendBuffer:(.*?):(.*?)/)[2];
    sendToServer(data, route, cbString);
  }
}

/*  cbString must be a string that is a name of a function
 *  within aegis object (set within buffer using GM_setValue)
 *
 */
function sendToServer(data, Proute, cbString) {

  var route = aegisURLstore;
  if (Proute != null) {
    route = Proute;
  }
  if (typeof data.time == "undefined") {
    data.time = serverTime;
  }
  if (typeof data.server == "undefined") {
    data.server = server;
  }
  if (typeof data.playerID == "undefined") {
    data.playerID = playerID;
  }

  var hashKey = "sendBuffer:"+route+":"+cbString+":"+data['time'];
  var postData = JSON.stringify(data);
  console.log("posting to aegis server: "+route + " " + postData);
  //  consoleMsg("sending to server");

  GM_setValue(hashKey, postData);
  //  sendTimeout = setTimeout(function() { checkSend(hashKey); }, 10000);

  GM_xmlhttpRequest({
    method: "POST",
    url: aegisURL + route,
    data: postData,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    timeout: 15000,
    ontimeout: function(response) {
      console.log("ontimeout :"+response);
      checkSend(hashKey);
    },
    onerror: function(response) {
      console.log("onerror :"+response);
    },
    onload: function(response) {
      console.log("onload :" + JSON.stringify(response));
      console.log("clearing "  +hashKey);
      GM_deleteValue(hashKey);
      var jsonResponse = JSON.parse(response.responseText);
      if (response.status == 200) {
        if (cbString != null) {
          try {
            aegis[cbString](jsonResponse);
          } catch(e) {
            console.log(e);
          };
        } else {

          console.log("got json status from server: "+jsonResponse.response);
          if (typeof jsonResponse.response != "undefined") {
            consoleMsg("server response: "+jsonResponse.response);
          }
        }
       
        clearTimeout(sendTimeout);
      } else {
        console.log('server error');
        consoleMsg("server error", "errMsg");
        //console.log(response.status);
      }

    }
  });
}

this.getGalaxyXML = function(context)
{
  var galaxy = context.galaxy;
  var callback = context.callback;

  console.log('getGalaxyXML');
  consoleMsg("obtaining "+server+" galaxy "+galaxy+" xml" );
  var galaxyNum = galaxy.match(/\d+/)[0];
  var rs = {
    server: server,
    regionStars: []
  };
  console.log(serverURL + "/galaxies_xml/" + server + "-"+galaxyNum+".xml");

  GM_xmlhttpRequest({
    method: "GET",
    url: serverURL + "/galaxies_xml/" + server + "-"+galaxyNum+".xml",
    onload: function(response) {
      console.log("onload : xml");
      if (response.status == 200) {
        consoleMsg("parsing galaxy ["+galaxy+"] xml");
        var xmlDoc = $.parseXML( response.responseText ),
        $xml = $( xmlDoc );

        //var systems = [];
        $xml.find('region').each ( function() {
          var region = this.id;
          $(this).find('stars').each(function() {
            var matches, regex = /(\d+).*?;/g, systems = [];
            while (matches = regex.exec($(this).text())) {
              systems.push(matches[1]);
              rs.regionStars.push(galaxy+":"+region+":"+matches[1]);
            }
//            console.log('setvalue '+'starMap:'+galaxy+":"+region + " = " + systems.join(":"));
            GM_setValue('starMap:'+galaxy+":"+region, systems.join(":"));
            //      console.log(galaxy+":"+region+":"+$(this).text());
          });
          //console.log($stars.text);
        });
        sendToServer(rs);

        if (callback != null) {
          if (typeof callback == "string") {
            aegis[callback]();
          } else {
            callback(); 
          }
        }
      } else {
        console.log("hmm");
        //console.log(response.status);
      }
    }
  });
}

function freeAccountRemoveAd(doc)
{
  var elem = doc.getElementById('advertising');
  if (elem != null) {
    elem.id="seeya";
    elem.innerHTML="";
  }
}

/* ripped from ae common
*/
//return true if a variable exists (is defined)
function exists (obj){
  if (typeof (obj) != "undefined" && obj != null)
    return true;

  return false;
}
//return an element by id, or object reference
function getElement(obj){
  if (typeof(obj) == "string"){

    if (document.getElementById == undefined || !document.getElementById)
      return false;

    obj = document.getElementById(obj);	
  }

  if (obj == undefined || !obj)
    return false;

  return obj;
}
function toggleHeight (obj){
  var cls = obj.className;
  if (cls.match(/^(.*?)-?small$/)) {
    obj.className = cls.match(/^(.*?)-?small$/)[1];
  } else {
    obj.className = cls + '-small';
  }
  console.log(obj);
  GM_setValue("setting:className:"+obj.id, obj.className);
}

/*  toggle an objects visible style settings
 *    (display, visibility, and zIndex)
 *
 *  also, store them so that all tabs retain the same settings
 */
function toggle (obj, displayType, state){
  if (displayType == null || displayType == undefined)
    displayType = "block";

  obj = getElement(obj);

  if (!obj)
    return false;

  if (state != null && state != undefined){
    if (state) {
      obj.style.display = displayType;
      obj.style.zIndex = "999999";
      obj.style.visibility = "visible";
    } else {
      obj.style.display = "none";
      obj.style.visibility = "hidden";
      obj.style.zIndex = "-999999";
    }

  }else{
    if (!obj.style.display || obj.style.display == displayType) {

      obj.style.display = "none";
      obj.style.visibility = "hidden";
      obj.style.zIndex = "-999999";
    } else {
      obj.style.display = displayType;
      obj.style.visibility = "visible";
      obj.style.zIndex = "999999";
    }
  }
  GM_setValue("setting:style:display:" +obj.id, obj.style.display);
  GM_setValue("setting:style:visibility:" +obj.id, obj.style.visibility);
  GM_setValue("setting:style:zIndex:" +obj.id, obj.style.zIndex);
}

/*  restore visiblity style settings if cached
 *
 */
function restoreSettings(obj)
{
  var value;
  value = GM_getValue("setting:style:display:"+obj.id);
  if (value != undefined) {
    obj.style.display = value;
  }
  value = GM_getValue("setting:style:visibility:"+obj.id);
  if (value != undefined) {
    obj.style.visibility = value;
  }
  value = GM_getValue("setting:style:zIndex:"+obj.id);
  if (value != undefined) {
    obj.style.zIndex = value;
  }

  value = GM_getValue("setting:className:"+obj.id);
  if (value != undefined) {
    obj.className = value;
  }
}

function show(obj, displayType){
  toggle(obj, displayType, true);
}

function hide(obj, displayType){
  toggle(obj, displayType, false);
}

function getScrollX(){
  if (exists(window.pageXOffset))
    return window.pageXOffset;
  else if (exists(document.documentElement) && exists(document.documentElement.scrollLeft))
    return document.documentElement.scrollLeft;
  else if (exists(document.body.scrollLeft))
    return document.body.scrollLeft;
  else 
    return 0;
}

function getScrollY(){
  if (exists(window.pageYOffset))
    return window.pageYOffset;
  else if (exists(document.documentElement) && exists(document.documentElement.scrollTop))
    return document.documentElement.scrollTop;
  else if (exists(document.body.scrollTop))
    return document.body.scrollTop;
  else 
    return 0;
}

function registerEvent(obj, event, callback, capture){
  if (!exists(obj) || !exists(event) || !exists(callback))
    return false;

  if (typeof(capture) == "undefined")
    capture = true;

  if (exists(obj.attachEvent))
    return obj.attachEvent("on"+event, callback);
  else if (exists(obj.addEventListener))
    return obj.addEventListener(event, callback, capture);
  else
    return false;
}

function unregisterEvent(obj, event, callback, capture){
  if (!exists(obj) || !exists(event) || !exists(callback))
    return false;

  if (typeof(capture) == "undefined")
    capture = true;

  if (exists(obj.detachEvent))
    return obj.detachEvent("on"+event, callback);
  else if (exists(obj.removeEventListener))
    return obj.removeEventListener(event, callback, capture);
  else
    return false;
}

/*  curGalReg is the element where scanRegion takes it's region from
 *    while moving around in the map, this element will take the currently
 *    selected galaxy/region
 *
 *  TODO: get off the half-second timer for an update
 */
function updateGalaxyRegion () {
  var curGalReg = document.getElementById('curGalReg');
  if (curGalReg == null) {
    console.log('curGalReg is null!');
    return;
  }
  var region = unsafeWindow.mapCurrentRegion;
  var galaxy = unsafeWindow.starsGalaxy;
  if (region == null) {
    if (document.URL.match(/([A-Za-z][0-9]{2}):([0-9]{2})/)) {
      var gr = document.URL.match(/([A-Za-z][0-9]{2}):([0-9]{2})/);
      galaxy = gr[1];
      region = gr[2];
    } else {
      return;
    }
  }
  curGalReg.innerHTML = galaxy;
  if (region != null) {
    curGalReg.innerHTML += ":" + region;
  }

  var getLoc = document.getElementById('getLocation');

  var changeRegion = function(){ updateGalaxyRegion(); };
  if (getLoc != null && getLoc.value.match(/[A-Za-z][0-9]{2}:[0-9]{2}$/)) {
    curGalReg.innerHTML = getLoc.value.match(/[A-Za-z][0-9]{2}:[0-9]{2}$/)[0];
    registerEvent(getLoc, "change", changeRegion);
  }

  var t = window.setTimeout(updateGalaxyRegion, 500);
}

function myFleetAt(location)
{
  var fleet = JSON.parse(GM_getValue("myfleet:at:"+location, {}));
  console.log(JSON.stringify(fleet));
  return fleet;
}

function ctxMoveScout(ctx) {
  moveScout(ctx.fromLoc, ctx.ToLoc);
}

function moveScout(fromLoc, toLoc)
{
  console.log('moveScout '+fromLoc + " to "+toLoc);
  var data = {};
  var fleet = myFleetAt(fromLoc);
  if (fleet.id != null) {
    data.destination = toLoc;
    data['Scout Ship'] = 1;
    sendMoveFleet(fleet.id, data);
  } else {
    consoleMsg('no fleet @ '+fromLoc, "errMsg");
  }
}

//destination=B38%3A60%3A47%3A21&Scout+Ship=1&units=Scout+Ship&fleet_ch1=9498989699&fleet_ch2=1
//form id="move_fleet_form" method="post" action="fleet.aspx?fleet=618490&view=move_start"a
//<input type="text" class="input-numeric" value="B39:64:08:21" maxlength="12" size="13" onchange="calc_distance()" name="destination" id="destination">
//
//destination=B39%3A73%3A98%3A11&Scout+Ship=1&Cruiser=1&units=Scout+Ship%2CCruiser&fleet_ch1=9498989699&fleet_ch2=1

//function moveFleet(aeData, url, doc)

function sendMoveFleet(fleetID, data)
{
  var units = [];
  if (data.destination == null) {
    consoleLog('sendMoveFleet: no destination!', "errMsg");
    console.log('sendMoveFleet: no destination!');
    return;
  }
  console.log(JSON.stringify(data));
  for (var k in data) {
    console.log(k);
    console.log(data[k]);
    if (k != 'destination' && k != 'fleet_ch1' && k != 'fleet_ch2') {
      units.push(k);
    }
  }
  data.units = units.join(',');

  if (data.fleet_ch1 == null) {
    data.fleet_ch1 = GM_getValue("moveFleet:fleet_ch1:"+playerID, null);
    if (data.fleet_ch1 == null) {
      console.log("invalid fleet_ch1!");
      consoleMsg("unknown fleet_ch1!<br>try moveFleetFromForm first", "errMsg");
      return;
    }
  }
  if (data.fleet_ch2 == null) {
    data.fleet_ch2 = 1;
  }

  var postData = $.param(data); //begginning to love jquery
  console.log('sendMoveFleet '+fleetID + " : " + postData);

  GM_xmlhttpRequest({
    method: "POST",
    url: serverURL + '/fleet.aspx?fleet=' +fleetID + "&view=move_start",
    data: postData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 15000,
    ontimeout: function(response) {
      console.log("ontimeout :"+response);
      consoleMsg('ae svr timeout, resend', "errMsg");
//      sendMoveFleet(fleetID, data);
    },
    onerror: function(response) {
      console.log("onerror :"+response);
    },
    onload: function(response) {
      var doc = responseDoc(response.responseText);
      var el = doc.getElementsByClassName("error");
      if (el != null && el.length > 0) {
        consoleMsg('problem with spacedocks!<br>&nbsp;&nbsp;' + el[0].textContent, "errorMsg");
        console.log("moveFleet error: "+el[0].textContent);
      } else if (response.responseText.indexOf("Fleet movement started") > -1) {
        consoleMsg('fleet embarked', "noticeMsg");
        console.log(response.responseText);
        document.location.href = serverURL + "/fleet.aspx";
      }
    }
  });
}

/*  display a countdown until server time becomes elThen.title time
 */
function displayTimeCountdown(elThen)
{
  var thenTime = elThen.getAttribute("title");
  var mThen = new moment( thenTime );
  elThen.innerHTML = mThen.format("YYYY/MM/DD HH:mm:ss");

  mCST =  CurrentServerTime();
  var diff = moment.duration(mThen.diff( CurrentServerTime() ));

  var msgClass = "debugMsg";
  if (diff.asSeconds() < 10) {
    msgClass = "panicMsg";
  } else if (diff.asSeconds() < 60) {
    msgClass = "errMsg";
  } else if (diff.asSeconds() < 120) {
    msgClass = "infoMsg";
  }
  elThen.innerHTML += '<br><span class="'+msgClass+'"><b>'+ 
    diff.format("h [hrs] m [min] s [sec]") + "</b></span>";
}

function moveFleetFromForm()
{
  var fleetID;
  var el = document.URL.match(/fleet\.aspx\?fleet=(\d+)&view=move/);
  if (el == null) {
    return;
  } else {
    fleetID = el[1];
  }
  var data= {};
  var tbxMsg = [];

  var start = document.getElementById('start');
  start = start.textContent;

  var el = document.getElementById('destination');

  // set up post data
  //
  var el = document.getElementById('destination');
  if (el != null && el.value != start && el.value.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
    data.destination = el.value;
  } else {
    consoleMsg("invalid destination!", "errMsg");
    return;
  }
  ships.forEach(function(ship, i, ar) {
    var el = document.getElementById('quant'+ship);
    if (el != null) {
      if (el.value > 0) {
        data[ship] = el.value;
        tbxMsg.push(ship + ": "+el.value);
      }
    }
  });

  var el = document.getElementsByName('fleet_ch1');
  if (el != null) { 
    data.fleet_ch1=el[0].value;
    var prevVal = GM_getValue("moveFleet:fleet_ch1:"+playerID);
    if (prevVal != data.fleet_ch1) {
      console.log("old fleet_ch1: "+prevVal);
    }
    console.log("fleet_ch1:"+data.fleet_ch1);
    GM_setValue("moveFleet:fleet_ch1:"+playerID, data.fleet_ch1);
  }
  el = document.getElementsByName('fleet_ch2');
  if (el != null) {
    data.fleet_ch2=el[0].value;
  }

  //  callback for sending post
  //
  var sendPost = (function(f, d) {
    return function () {
      console.log('calling sendMoveFleet '+f +" : "+d);
      sendMoveFleet(f, d);
    };
  })(fleetID, data);

  // validate the time
  //
  var curServerTime = document.getElementById('server-time');
  var inputTime = document.getElementById('moveFleetTime');
  var mDepart = new moment(inputTime.value);

  var mServerTime = new moment(curServerTime.innerHTML);
  if (!mDepart.isValid()) {
    consoleMsg('invalid time!', "errorMsg");
    return;
  }
  if (mDepart.isBefore(mServerTime)) {
    consoleMsg('time in the past!', "errorMsg");
    return;
  }

  //  set up the delay
  //
  var timer;
  var cbDisplayCountdown;

  var delayedPost = (function(curServerTime, mDepart,sendPost) {
    var that = this;
    this.tick = function() {
      var mServerTime = new moment(curServerTime.innerHTML);
      if (mServerTime.isSame(mDepart) || mServerTime.isAfter(mDepart)) {
        console.log('calling sendpost');
        sendPost();
      } else {
        timer = window.setTimeout(function() { that.tick(); }, 1000);
        cbDisplayCountdown();
      }

    };
    return this.tick;
  })(curServerTime, mDepart, sendPost);

  //  visual elements
  //
  consoleMsg('delayed fleet move set for <br>' +
      mDepart.diff(mServerTime, 'seconds') + " seconds from now","infoMsg");

  inputTime.setAttribute('disabled', 'disabled');
  inputTime.className = 'aegisToolbox-text-set';

  var div = document.createElement("div");
  var btn = document.createElement("span");
  btn.id = 'cancelMoveButton';
  btn.className = 'aegisToolbox-button';
  btn.innerHTML = "Cancel";

  consoleMsg(tbxMsg.join(","));
  var spanTime = document.createElement("span");
  spanTime.className = 'aegisToolbox-text';
  spanTime.setAttribute('title', inputTime.value);

  cbDisplayCountdown = (function (elThen) {
    return function () {
      displayTimeCountdown(elThen);
    };
  })(spanTime);

  cbDisplayCountdown();
  
  var span = document.createElement("span");
  span.className = 'aegisToolbox-text';
  span.innerHTML = "destination: "+data.destination +"<br>"+ tbxMsg.join("<br>");

  var cancelClick = function() {
    window.clearTimeout(timer); 

    show(inputTime);
    inputTime.className = 'aegisToolbox-text';
    inputTime.removeAttribute('disabled');

    inputTime.parentNode.removeChild(div);
    consoleMsg("delayed fleet movement canceled","infoMsg");
  };
  registerEvent(btn, "click", cancelClick);

  div.appendChild(document.createElement("br"));
  div.appendChild(btn);
  div.appendChild(document.createElement("br"));
  div.appendChild(spanTime);
  div.appendChild(span);
  inputTime.parentNode.appendChild(div);
  hide(inputTime);

  delayedPost();

}


(this.makeConsole = function () {
  if (!document.location.href.match(/\/(.+?).astroempires.com/)) { return; }

  var container = document.getElementById("aegisConsole-Container");
  var consoleHeader = document.getElementById("aegisConsole-Header");
  var aconsole = document.getElementById("aegisConsole");
  var toolbox = document.getElementById('aegisConsole-Toolbox');

  if (!consoleHeader){
    var colorBlueLight = '#6f8dac', colorBlueDark = '#3c5268',
    colorPurpleLight = '#EB7AE1', colorPurpleDark = '#301070';

    //create console element
    consoleHeader = document.createElement("div");
    consoleHeader.id = "aegisConsole-Header";
    consoleHeader.className = "aegisConsole-Header";
    consoleHeader.innerHTML=("<span id='aegis-tag'><b>aegis v"+version+"</b></span>");

    var consoleHeaderClick = function(){ toggle(toolbox); toggle(aconsole);};
    registerEvent(consoleHeader, "click", consoleHeaderClick);

    //		document.body.appendChild(consoleHeader);
  }
  if (!toolbox) {
    toolbox = document.createElement("div");
    toolbox.id = "aegisConsole-Toolbox";
    toolbox.className = 'aegisConsole-Toolbox';

    var btnScanRegion = document.createElement('span');
    btnScanRegion.id='btnScanRegion';
    btnScanRegion.className = 'aegisToolbox-button';
    btnScanRegion.innerHTML = 'Scan Region';

    toolbox.appendChild(btnScanRegion);

    var curGalReg = document.createElement('span');
    curGalReg.id='curGalReg';
    curGalReg.className='curGalReg';
    toolbox.appendChild(curGalReg);
    //  updateGalaxyRegion(); - depends on document.getElementById, wait
    //    for toolbox to be added


//  Scan region    
    var btnDM = document.createElement('span');
    btnDM.id='btnScanRegion';
    btnDM.className = 'aegisToolbox-button';
    btnDM.innerHTML = 'Timed Move Fleet';
    toolbox.appendChild(document.createElement('br'));
    toolbox.appendChild(btnDM);
    toolbox.appendChild(document.createElement('br'));


// delayed move fleet    
    var inpTime = document.createElement('input');
    inpTime.id='moveFleetTime';
    inpTime.name='moveFleetTime';
    inpTime.className='aegisToolbox-text';

    inpTime.setAttribute("type", "text");

    elem=document.getElementById('server-time');
    if (elem != null) {
      var serverTime = elem.getAttribute("title");
      var mST = new moment(new Date(serverTime));
      mST.add(10, 'seconds');
      inpTime.setAttribute("value", mST.format("YYYY/MM/DD HH:mm:ss"));
    }

    toolbox.appendChild(inpTime);

// move scout    
    var btnMS = document.createElement('span');
    btnMS.id='btnMoveScout';
    btnMS.className = 'aegisToolbox-button';
    btnMS.innerHTML = 'Move Scout';

    var inpLoc = document.createElement('input');
    inpLoc.id='moveScoutFrom';
    inpLoc.name='moveScoutFrom';
    inpLoc.setAttribute('maxlength','12');
    inpLoc.className='reset-this aegisLoc';
    inpLoc.setAttribute("type", "text");

    var inpTo = document.createElement('input');
    inpTo.id='moveScoutTo';
    inpTo.setAttribute('maxlength','12');
    inpTo.name='moveScoutTo';
    inpTo.className='reset-this aegisLoc';
    inpTo.setAttribute("type", "text");


var lbl = document.createElement('span');
lbl.innerHTML = "From: ";
lbl.className = 'aegisToolbox-label';
var lbl2 = document.createElement('span');
lbl2.innerHTML = "To: ";
lbl2.className = 'aegisToolbox-label';

    toolbox.appendChild(document.createElement('br'));
    toolbox.appendChild(btnMS);
    toolbox.appendChild(document.createElement('br'));
    toolbox.appendChild(lbl);
    lbl.appendChild(inpLoc);
    toolbox.appendChild(document.createElement('br'));
    toolbox.appendChild(lbl2);
    lbl2.appendChild(inpTo);

// button callbacks

    registerEvent(btnScanRegion, "click", function() {
      var curGalReg = document.getElementById('curGalReg');
      if (curGalReg != null && curGalReg.textContent.length > 0) {
        document.title = curGalReg.textContent + ' scan';
        scanRegion(curGalReg.textContent);
      } else {
        consoleMsg("no region selected!","errMsg");
      }
    });

    registerEvent(btnDM, "click", function() { moveFleetFromForm(); });

    registerEvent(btnMS, "click", function () { 
      moveScout(document.getElementById('moveScoutFrom').value,
        document.getElementById('moveScoutTo').value);
    });

  }

  if (!aconsole) {
    aconsole = document.createElement("div");
    aconsole.id = "aegisConsole";
    aconsole.className = 'aegisConsole';

    var consoleClick = function(){ toggleHeight(aconsole); };
    //var pageScroll = function(){ console.style.left = getScrollX()+"px"; console.style.top = getScrollY()+"px"; };

    //set events
    registerEvent(aconsole, "click", consoleClick);
    //registerEvent(document.body, "scroll", pageScroll);
    //window.onscroll = pageScroll;

    //		document.body.appendChild(aconsole);

    aconsole.innerHTML = GM_getValue('aegisConsole:'+getTabID(), "tabID: "+getTabID());
  }

  if (!container){
    container = document.createElement("div");
    container.id = "aegisConsole-Container";
    container.className = "aegisConsole-Container";

    container.appendChild(consoleHeader);
    container.appendChild(toolbox);
    container.appendChild(aconsole);

    restoreSettings(toolbox);
    restoreSettings(aconsole);

    document.body.insertBefore(
        container, 
        document.body.firstChild
        );

    updateGalaxyRegion();
  }

  this.consoleMsg = function(msg, level)
  {
    if (typeof(level) == "string") {
      msg = "<span class='"+level+"'>"+msg+"</span>";
    }

    if (typeof(msg) == "string") {
      msg = msg + "<br>" + aconsole.innerHTML;
      aconsole.innerHTML = msg;
      GM_setValue('aegisConsole:'+getTabID(), msg);
    } else {
      console.log('consolMsg: '+typeof(msg));
    }
  }
})();

function myTimeTimer()
{
  var now = new Date();
  myTime=now.formatDate('D jS M @ g:i:s a');
  elem=document.getElementById('my-time');
  elem.innerHTML=myTime;
  var t = window.setTimeout(myTimeTimer, 1000);
}

function replaceTime(doc)
{
  elem=doc.getElementById('server-time');
  var serverTime = elem.getAttribute("title");
  //    elem.id = "old-server-time";
  //    elem.innerHTML = "<span id='server-time' title='"+serverTime+"'></span>&nbsp&nbsp&nbsp&nbsp<span id='my-time'></span>";
  //myTimeTimer();

  for(n=1;n<=500;n++)
  {
    elem=doc.getElementById('timer'+n);
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
            endTime="Today @ "+d.formatDate('g:i:s a');
          }
          else if(tempdate.toLocaleDateString() == d.toLocaleDateString())
          {
            endTime="Tomorrow @ "+d.formatDate('g:i:s a');
          }
          else
          {
            endTime=d.formatDate('D jS M @ g:i:s a');
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
///
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

function toFixed(value, precision) {
  var power = Math.pow(10, precision || 0);
  return String(Math.round(value * power) / power);
}

function xml2string(node) {
  if (typeof(XMLSerializer) !== 'undefined') {
    var serializer = new XMLSerializer();
    return serializer.serializeToString(node);
  } else if (node.xml) {
    return node.xml;
  }
}

function matchFirstPos(string, re)
{
  if (string == null || re == null) {
    return null;
  }
  var m = string.match(re);
  if (m != null && m.length > 0) {
    return m[1];
  } else {
    return null;
  }
}

function fieldRightOfSlash(string)
{
  var m = string.match(/([\d.]+).*?\/.*?(\d+)/);
  if (m != null && m.length > 2) {
    return m[2];
  }
}

function fieldPlayerFromLink(aeData, link)
{
  var player = {};
  console.log('player from link '+link.innerHTML);
  if (link.href.match(/profile\.aspx\?player=(\d+)$/)) {
    player['id'] = link.getAttribute("href").match(/=(\d+)$/)[1];
    player['level'] = matchFirstPos(link.getAttribute("title"), /level ([\d+\.,]+)/);
    if (player['level'] == null) {
      delete player['level'];
    }

    if (link.textContent.match(/\[.*?\]/)) {
      player['guild'] = {tag: link.textContent.match(/(\[.*?\])/)[1] };
      player['name'] = link.textContent.match(/\]\s*?(\S.*?)$/)[1];
    } else {
      player['name'] = link.textContent;
    }
    var id = player['id'];
    aeData.add('player',player);
    return id;
  } else {
    return null;
  }
}

function parseMapFleet(aeData, table, location, follow) {
  if (location != null) {
    consoleMsg('parseMapFleet '+location);
  }

//  console.log(xml2string(table));

  var tr = table.getElementsByTagName('tr');

  //aeData['fleet'] = [];
  //console.log(tr.length);

  for(r=0; r<tr.length; r++){
    var dtRow = {};

    dtRow['location'] = location;

    var tds = tr[r].getElementsByTagName('td');
    if (tds != null && tds.length >= 4){
      var i = 0; 
      var a = tds[i++].getElementsByTagName('a');
      if (a != null && a.length > 0) {
        dtRow['id'] = matchFirstPos(a[0].href, /fleet\.aspx\?fleet=(\d+)/);
        dtRow['name'] = a[0].innerHTML;
      }
      var a = tds[i++].getElementsByTagName('a');
      if (a != null && a.length > 0) {
        dtRow['owner'] = fieldPlayerFromLink(aeData, a[0]);
      }

      if (location == null) {
        var sortKey = tds[i++].getAttribute("sorttable_customkey");
        if (sortKey != null) {
          dtRow['location'] = sortKey;
        }

      }
      var sortKey = tds[i++].getAttribute("sorttable_customkey");
      if (sortKey != null) {
        dtRow['arrival'] = sortKey;
      }

      var sortKey = tds[i++].getAttribute("sorttable_customkey");
      if (sortKey != null) {
        dtRow['size'] = sortKey;
      }

    }

    if (Object.keys(dtRow).length > 0 && dtRow['id'] != null) {
      if (follow) {
        ctxQueueGet({url: "fleet.aspx?fleet="+dtRow['id'],
          msg: "scanning fleet "+dtRow['id']});
      }

      aeData.add('fleet',dtRow);
    }
  }
}

function parseScanner(aeData, url, doc, follow){

  consoleMsg('parseScanner');
  //console.log(xml2string(document.getElementById('coded_scanners')));
  var table = doc.getElementById('coded_scanners');
  if (table == null) {
    table = doc.getElementById('empire_scanners');
    if (table != null) {
      table = table.getElementsByTagName('table')[0];
    }
  }
  parseMapFleet(aeData, table, null, follow);

  console.log(JSON.stringify(aeData));
}


function parseFleet(aeData, url, doc) {
  var dtRow = {};
  if (url.match(/fleet.aspx\?fleet=(\d+)&view=move/)) {
    return;
  }
  if (url.match(/fleet.aspx\?fleet=(\d+)/)) {
    dtRow['id'] = url.match(/fleet.aspx\?fleet=(\d+)/)[1];
    consoleMsg('parseFleet '+ dtRow['id'] );
  } else {
    var table = doc.getElementById('fleets-list');
    if (table == null) { return; }
    var tr = table.getElementsByTagName('tbody')[1].getElementsByTagName('tr');
    if (tr == null) { return; }

  //  remove the orphans before we re-populate fleets
  //
  var keys = GM_listValues();
  var key = keys[0];
  for (var i=0; key != null; key=keys[i++] ) {

    if(key.match(/^myfleet:/)) {
      GM_deleteValue(key);
    }
  }

    for (i=0; i<tr.length; i++) {
      var fleet = {};
      var td = tr[i].getElementsByTagName('td');
      var a = td[0].getElementsByTagName('a');
      fleet.id = a[0].href.match(/fleet=(\d+)/)[1];
      fleet.name = a[0].textContent;
      fleet.location = td[1].getAttribute('sorttable_customkey');

      fleet.destination = td[2].getAttribute('sorttable_customkey');

      if (fleet.destination != null) {
        fleet.origin = fleet.location;
        delete fleet.location;
        fleet.arrival = td[3].getAttribute('sorttable_customkey');
      }

      fleet.size = td[4].getAttribute('sorttable_customkey');

      if (td[5].getAttribute('sorttable_customkey').length > 0) {
        fleet.comment = td[5].getAttribute('sorttable_customkey');
      }
      console.log(JSON.stringify(fleet));
      GM_setValue("myfleet:"+ fleet.id, JSON.stringify(fleet));

      if (fleet.location != null) {
        GM_setValue("myfleet:at:"+ fleet.location, JSON.stringify(fleet));
      }
    }
    return;
  }

  var tables = doc.getElementsByTagName('table');
  var playerAndLoc;
  for (i=0; i<tables.length; i++) {
    if (tables[i].id == "fleet_overview") {
      playerAndLoc = tables[i-1];
    }
  }
  //console.log(xml2string(playerAndLoc));

  //our fleets have either the form for base selection or for movement
  //  just care about nme fleets
  if (playerAndLoc != null && playerAndLoc.getElementsByTagName('form').length > 0) {
    console.log('returning');
    return;
  }
  var rows =  playerAndLoc.getElementsByTagName('tr');
  if (rows != null && rows.length > 1) {
    var cols = rows[1].getElementsByTagName('td');
    if (cols != null && cols.length >= 4) {
      var link = cols[0].getElementsByTagName('a');
      if (link != null && link.length > 0) {
        dtRow['owner'] = fieldPlayerFromLink(aeData, link[0]);
      }
      link = cols[1].getElementsByTagName('a');
      if (link != null && link.length > 0) {
        dtRow['location'] = link[0].getAttribute("href").match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];
      }
      //dest
      link = cols[2].getElementsByTagName('a');
      if (link != null && link.length > 0) {
        if (dtRow['location'] != null) {
          dtRow['origin'] = dtRow['location'];
        }
        dtRow['location'] = link[0].getAttribute("href").match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];
      }
      if (cols[3].getAttribute('title') != null && cols[3].getAttribute('title').match(/\d+/)) {
        dtRow['arrival'] = cols[3].getAttribute('title');
      }
    }
  }

  //console.log(xml2string(document.getElementById('fleet_overview')));

  var fleetTable = doc.getElementById('fleet_overview').getElementsByTagName('table')[0];
  var tr = fleetTable.getElementsByTagName('tr');
  var ships = {};
  for(r=0; r<tr.length; r++){
    var td = tr[r].getElementsByTagName('td');
    if (td.length > 0) {
      ships[td[0].textContent] = td[1].textContent.match(/([\d\.]+)/g).join("");
    }
  }
  if (Object.keys(ships).length > 0) {
    dtRow['ships'] = ships;
  }

  var fleetSize = doc.getElementById('fleet_overview').getElementsByTagName('center')[0].textContent;
  dtRow['size'] = fleetSize.match(/(\d+)/g).join("");


  aeData.add('fleet',dtRow);
}

function parseAstro(aeData, url, doc, follow) {

  var location = url.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];
  consoleMsg('parseAstro '+location);
  console.log('parseAstro');

  var aRow = {};
  var el = doc.getElementsByClassName('astro')[0];

  console.log(el.textContent);
  aRow['type'] = el.textContent.match(/(Astro Type: (.*?)Terrain)/)[2];
  aRow['terrain'] = el.textContent.match(/(Terrain: (.*?)Area)/)[2];
  aRow['location'] = location;

  var table = doc.getElementById('map_base');    
  var dtRow = {};
  if (table !== null) {

    //console.log(xml2string(table));

    var rows = table.getElementsByTagName('table')[0].getElementsByTagName('tr');
    //console.log("hmm" + rows.length);
    for(r=0; r<rows.length; r++){
      var col = rows[r].getElementsByTagName('td');
      if (col != null && col.length > 0) {

        var i = 0;

        var link = col[i++].getElementsByTagName('a')[0];
        dtRow['name'] = link.textContent;
        dtRow['id'] = link.getAttribute('href').match(/=(\d+)$/)[1];
        dtRow['location'] = location;

        link = col[i++].getElementsByTagName('a')[0];
        dtRow['owner'] = fieldPlayerFromLink(aeData, link);

        link = col[i++].getElementsByTagName('a')[0];
        if (link != null) {
          dtRow['occupier'] = fieldPlayerFromLink(aeData, link);
        }

        link = col[i].getElementsByTagName('a')[0];
        dtRow['economy'] = fieldRightOfSlash(link.textContent);
        dtRow['ownerIncome'] = toFixed(eval(link.textContent) * 100, 2);
      }

    }

    aeData.add('base',dtRow);
  }
  aeData.add('astro',aRow);

  var mapfleet = doc.getElementById('map_fleets');
  if (mapfleet != null) {
    parseMapFleet(aeData, mapfleet.getElementsByTagName('table')[0], location, follow);    
  }
}

function checkDaysOld(aeData, doc)
{
  var daysOld = null;
  var center = doc.getElementsByTagName('center');
  for (i = 0; i < center.length; i++) {
    //console.log(center[i].textContent)
    if (center[i].textContent.match(/Recorded data from (\d+)/)) {
      daysOld = center[i].textContent.match(/Recorded data from (\d+)/)[1];
      aeData.daysOld = daysOld;
    }
  }
  return daysOld;
}

function parseSystem(aeData, url, doc, follow) {
  var system = url.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}/);
  if (!system) {
    return;
  }
  consoleMsg('parseSystem '+system[0]);
  var astroRow = {};
  var baseRow = {};
  var fleetRow = {};

  var daysOld = checkDaysOld(aeData, doc);

  var table = doc.getElementsByClassName('system')[0];
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
          baseRow['id'] = link.getAttribute("href").match(/base\.aspx\?base=(\d+)/)[1];
          console.log(baseRow['id']);

          baseRow['location'] = astroRow['location'] ;
          astroRow['base'] = baseRow['id'];

          if (follow) {
            ctxQueueGet({url: link.href, msg: "found base at "+astroRow['location']});
          }
        }

        //for astros with bases, the subsequent 1-3 divs will
        // hold player and fleet info
        var node = link.nextSibling;
        for (next = node; next != null && next.tagName !== "A"; next = next.nextSibling) {
          //console.log("next tag: " + next.tagName);
          if (next.tagName == "DIV") {
            var a = next.getElementsByTagName('a');
            var div =  next.getElementsByTagName('div');
            if (a != null && a.length > 0) {

              var player = fieldPlayerFromLink(aeData, a[0]);

              if (baseRow['owner'] != null) {
                baseRow['occupier'] = player;
              } else {
                baseRow['owner'] = player;
              }
            }
            if (div != null && div.length > 0) {
              for (i = 0; i < div.length; i++) {
                var fleet = div[i].getAttribute("title");
                if (fleet != null) {
                  if (!(fleet.match(/Self/))) {
                    var nfo = fleet.match(/Fleet present: ([\d,]+) - Incoming: ([\d,])/);
                    if (nfo != null && nfo.length > 0) {
                      astroRow['unknownFleet'] = nfo[1].match(/\d+/g).join("");
                      astroRow['unknownIncoming'] = nfo[2].match(/\d+/g).join("");

                      //follow the fleet unless already following because of base
                      if (follow && baseRow['id'] == null) {
                        ctxQueueGet({url: "map.aspx?loc="+astroRow['location'],
                            msg: "found fleet at "+astroRow['location']});
                      }
                    }
                  }
                }
              }
              //               console.log(JSON.stringify(aeData));

            }
          }
        }
        if (Object.keys(baseRow).length > 0 &&
            baseRow['id'] != null && baseRow['owner'] != null) {
              aeData.add('base',baseRow);
              baseRow = {};
            }
        aeData.add('astro',astroRow);
        astroRow = {};
      }
    }
  }
}

function parseBase(aeData, url, doc, follow) {

  if (! url.match(/base\.aspx\?base=(\d+)(&view=)?$/)) {
    return;
  }

  var baseRow = {};
  baseRow['id'] = matchFirstPos(url, /base\.aspx\?base=(\d+)/);
  consoleMsg('parseBase '+ baseRow['id']);

  var tables = doc.getElementsByTagName('table');
  if (tables != null && tables.length > 0) {
    for (i = 0; i < tables.length; i++) {
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

      if (rows != null && rows.length > 1) {
        var colsTH =  rows[0].getElementsByTagName('th');
        var colsTD =  rows[1].getElementsByTagName('td');

        if (colsTD.length > 4 && colsTH.length == 6) {
          //your base
          var op = colsTH[0].getElementsByTagName('option');
          if (op != null && op.length > 0) {
            var o = op[0];
            for (var i = 0; o != null; o = op[++i]) {
              console.log(o.getAttribute("selected"));
              console.log(o.innerHTML + "|" + o.textContent);
              if (o.getAttribute("selected") == "selected") {
                baseRow['name'] = o.textContent.match(/^\s?((\S+\s?)+\S+)\s?$/)[1];
              }
            }
            for (ih = 1; ih < colsTH.length; ih++) {
              //console.log(colsTH[ih].textContent  + " = " + colsTD[ih - 1].textContent);
              var key = colsTH[ih].textContent;
              if (key == "Location") {
                baseRow['location'] = colsTD[ih - 1].textContent;
              } else if (key == "Trade Routes") {
                baseRow['tradeRoutes'] = colsTD[ih - 1].textContent;
              }
            }

          } else {
            //others base
            for (ih = 0; ih < colsTH.length; ih++) {
              console.log(colsTH[ih].textContent  + " = " + colsTD[ih].textContent);
              var key = colsTH[ih].textContent;
              if (key == "Base Name") {
                baseRow['name'] = colsTD[ih].textContent.match(/^\s?((\S+\s?)+\S?)\s?$/)[0];
              } else if (key == "Location") {
                baseRow['location'] = colsTD[ih].textContent;
              } else if (key == "Trade Routes") {
                baseRow['tradeRoutes'] = colsTD[ih].textContent;
              }
            }
          }
        }
      }
    }
  }
  var tblCap = doc.getElementById('base_processing-capacities').getElementsByTagName('table')[0];
  //console.log(xml2string(tblCap));

  var trs = tblCap.getElementsByTagName('tr');
  for (var i = 0; i < trs.length; i++) {
    var tr = trs[i];
    var tds = tr.getElementsByTagName('td');
    if (tds != null && tds.length > 0) {
      if (tds[0].textContent == "Base Owner") {
        var a = tds[1].getElementsByTagName('a');
        if (a != null && a.length > 0) {
          baseRow['owner'] = fieldPlayerFromLink(aeData,a[0]);
        }
      } else if (tds[0].textContent == "Economy") {
        baseRow['economy'] = tds[1].textContent;
      } else if (tds[0].textContent == "Owner Income") {
        //        if (tds[1].textContent != baseRow['economy']) {
        baseRow['ownerIncome'] = toFixed(tds[1].textContent / baseRow['economy'] * 100, 2);
        //        }
      }
    }
  }

  var baseFleets = doc.getElementById('base_fleets');
  if (baseFleets != null) {
    console.log('has base_fleets');
    var tblFleets = baseFleets.getElementsByTagName('table');
    if (tblFleets != null && tblFleets.length > 0) {
      parseMapFleet(aeData, tblFleets[0], baseRow['location'], follow);
    }
  }

  var tblStru = doc.getElementById('base_resume-structures');
  if (tblStru != null) { 
    tblStru = tblStru.getElementsByTagName('table')[0];
  }

  if (tblStru != null) { 
    //  console.log(xml2string(tblStru));

    var struct = {};
    var trs = tblStru.getElementsByTagName('tr');
    for (i = 0; i < trs.length; i++) {
      var tds = trs[i].getElementsByTagName('td');
      if (tds != null && tds.length > 0) {
        var bld = tds[0];
        var bldVal = tds[1];
        if (bld != null && bldVal != null) {
          var name = bld.getElementsByTagName('span');
          var val = bldVal.innerHTML.split("<br>");
          for (j = 0; j < name.length; j++) {
            if (name[j] != null && val[j] != null) {
              struct[name[j].textContent] = val[j];
            }
          }
        }

        var ccJg = tds[2];
        var ccJgVal = tds[3];
        if (ccJgVal != null && ccJgVal.textContent.match(/\d/)) {
          //console.log( ccJgVal.innerHTML);
          var vals = ccJgVal.innerHTML.match(/(\d+)</g);
          struct['Command Centers'] = vals[0].match(/\d+/)[0];
          if (vals.length > 1) {
            struct['Jump Gate'] = vals[1].match(/\d+/)[0];
          }
        }
        var def = tds[4];
        var defVal = tds[5];
        if (def != null && defVal != null) {
          var name = def.getElementsByTagName('span');
          var val = defVal.getElementsByTagName('span');
          for (j = 0; j < name.length; j++) {
            if (name[j] != null && val[j] != null) {
              struct[name[j].textContent] = fieldRightOfSlash(val[j].textContent);
            }
          }
        }
        if (Object.keys(struct).length > 0) {
          baseRow['structures'] = struct;
        }
      }
    }
  }
  aeData.add('base',baseRow);
}

function parseEmpire(aeData, url, doc)
{
  consoleMsg('parseEmpire player '+playerID);
  var baseRow = {};

  var table = doc.getElementById('empire_events').getElementsByTagName('table')[0];
  var rows = table.getElementsByTagName('tr');
  for (i = 0; i < rows.length; i++) {
    var cols = rows[i].getElementsByTagName('td');
    if (cols != null && cols.length > 0) {
      var a = cols[0].getElementsByTagName('a')[0];
      baseRow['name'] = a.textContent;
      baseRow['id'] = a.href.match(/base=(\d+)$/)[1];

      a = cols[1].getElementsByTagName('a')[0];
      baseRow['location'] = a.href.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];

      //save base locations for scan buttons
      //
      GM_setValue("myBase:"+baseRow['id'], baseRow['location']);

      baseRow['economy'] = fieldRightOfSlash(cols[2].textContent);
      //      baseRow['economy'] = cols[2].textContent;
      baseRow['owner'] = playerID;

      a = cols[3].getElementsByTagName('a')[0];
      var occ = a.href.match(/player=(\d+)/)[1];
      if (occ > 0) {
        baseRow['occupier'] = fieldPlayerFromLink(aeData, a);
      }

      aeData.add('base',baseRow);
      baseRow={};
    }
  }
}

function parseGuild(aeData, url, doc)
{
  consoleMsg('parseGuild player '+playerID);
  if (url.match(/\?guild=(\d+)/)) {
  }
  var playerRow = {};
  var guild = {};
  //guild
  var table=doc.getElementById('profile_show').getElementsByTagName('table')[0];
  var rows = table.getElementsByTagName('tr');
  if (rows != null && rows.length > 0) {
    guild['name'] = rows[0].textContent.match(/^\s?((\S+\s?)+\S+)\s?$/)[1];
    var match = rows[1].textContent.match(/Guild: (\d+).*?Tag: (\[.*?\])/);
    if (match != null && match.length > 0) {
      guild['id'] = match[1];
      guild['tag'] = match[2];
    }
  }


  //members
  var table=doc.getElementById('guild_members').getElementsByTagName('table')[0];
  var row;
  var rows = table.getElementsByTagName('tr');
  for (var i=0, row=null; row=rows[i]; i++) {
    var cols  = row.getElementsByTagName('td');
    if (cols != null && cols.length > 0) {
      var link = cols[2].getElementsByTagName('a')[0];
      playerRow['name'] = link.textContent;
      playerRow['id'] = link.getAttribute("href").match(/=(\d+)$/)[1];
      if (cols[3].textContent.match(/(Free|Upgraded)/)) {
        playerRow['upgraded'] = cols[3].textContent;
      }
      if (cols[4].textContent.match(/[\d\.]+/)) {
        playerRow['level'] = cols[4].textContent;
      }
      playerRow['guild'] = guild;
    }
    aeData.add('player',playerRow);
    playerRow = {};
  }
}

/*  
 *
 */
function coalesceArray(a,b)
{
  var out = [];
  if (exists(a)) {
    for (var i =0; i < a.length; i++) {
      out.push(a[i]);
    }
  }
  if (exists(b)) {
    for (var i =0; i < b.length; i++) {
      out.push(b[i]);
    }
  }
  return out;
}

function listViewableStars()
{
  var m2 = document.getElementById('map2_Wrapper');
  var normal = document.getElementsByClassName('star-normal');
  var fog = document.getElementsByClassName('star-fog');
  console.log('current: '+unsafeWindow.starsGalaxy + ':' + unsafeWindow.mapCurrentRegion);
  var stars = coalesceArray(normal, fog);

  //    var curReg = unsafeWindow.mapCurrentRegion;
  for (var i =0; i < stars.length; i++) {
    console.log(i + " " + stars[i].id);
  }

  //  unsafeWindow.go2region(76);
}


/*  http://wiki.greasespot.net/Talk:GM_xmlhttpRequest
*/
(function(){
  "use strict";
  var HTMLParser;
  function HTMLParser() {
    this.newDocument = function () {
      var dt;
      dt = document.implementation.createDocumentType("html", "-//W3C//DTD HTML 4.01 Transitional//EN", "http://www.w3.org/TR/html4/loose.dtd");
      this.doc = document.implementation.createDocument('', '', dt);
    };
    this.loadString = function (htmlstring) {
      if (!htmlstring) {
        return false;
      }
      this.newDocument();
      this.doc.appendChild(this.doc.createElement('html'));
      this.doc.documentElement.innerHTML = htmlstring;
      return this.doc;
    };
    return this.newDocument();
  }
}());

function assertCtx(ctx, keyTypes)
{
  if (ctx == null && typeof ctx != "object") {
    throw new Error('invalid context!');
  }
  if (keyTypes != null && typeof keyTypes == "object") {
    for (i in keyTypes) {
      if (typeof keyTypes[i] == "string") {
        if (typeof ctx[i] != keyTypes[i]) {
          throw new Error('assertion '+i+' isa '+keyTypes[i]);
        }
      } else if (typeof keyTypes[i] == "number") {
        console.log('implement me 198746');

      }
    }
  }
}

var sendQ = {
  items: 0,
  head: 0,
  push: function(ctx) {
    try {
      assertCtx(ctx, {url: "string", msg: "string"});
    } catch(e) {
      console.log(e);
      return;
    }

    var tag = 'sendQ:'+ getTabID();
    var tail = GM_getValue(tag+':tail',0);
    /*
    GM_setValue(tag +':url:'+tail, JSON.stringify(ctx))
      GM_setValue(tag +':msg:'+tail, msg);
      */
    GM_setValue(tag +':ctx:'+tail, JSON.stringify(ctx))

    console.log("set "+tag +':'+tail);

    GM_setValue(tag+':tail',++tail);
    console.log("new tail "+ GM_getValue(tag+':tail',0));
  },
  shift: function() {
    var tag = 'sendQ:'+ getTabID();
    var head = GM_getValue(tag+':head',0);
    var tail = GM_getValue(tag+':tail',0);

    var ctx = JSON.parse(GM_getValue(tag +':ctx:'+head, ''));

    console.log('head '+head+ ' url '+ctx.url);

    try {
      assertCtx(ctx, {url: "string", msg: "string"});
    } catch(e) {
      console.log(e);
      return;
    }

    GM_deleteValue(tag +':ctx:'+head);
    GM_setValue(tag+':head',++head);

    if (head == tail) {
      GM_setValue(tag+':tail',0);
      GM_setValue(tag+':head',0);
    }
    console.log('new head '+head + ', tail '+tail);
    return ctx;
  },
  clear: function() {
    var tag = 'sendQ:'+ getTabID();
    var head = GM_getValue(tag+':head',0);
    var tail = GM_getValue(tag+':tail',0);
    for (var i = head; i <= tail; i++) {
      GM_deleteValue(tag +':ctx:'+i);
    }
    GM_setValue(tag+':tail',0);
    GM_setValue(tag+':head',0);

  },
  length: function () {
    var tag = 'sendQ:'+ getTabID();
    var head = GM_getValue(tag+':head',0);
    var tail = GM_getValue(tag+':tail',0);
    return (tail - head);
  }
};
/*
sendQ.watch('items', function(id, oldval, newval) {
  console.log('sendQ.' + id + ' changed from ' + oldval + ' to ' + newval);
  console.log('items in watch '+sendQ.length);
  //    window.setTimeout(function(){ sendQueued(ctxDispatchResponse); }, 250);
  return newval;
});
*/

var alarm;
this.isSending = function()
{
  var tag = 'sendQ:'+ getTabID();
  var waitfor = GM_getValue(tag+':waitFor', null);
  if (waitfor != null) {
    console.log('waitfor: '+waitfor);
    return true;
  }
  return false;
}
function sendQueued(ctx)
{
  var tag = 'sendQ:'+ getTabID();
  if (sendQ.length() <= 0) {
    if (alarm != null) {
      window.clearTimeout(alarm);
      console.log('cleared timeout');
    }
    console.log('returning from sendQueued urls:'+sendQ.length());
    return;
  }
  //return if we havent passed wait time
  if ((new Date().getTime()) < parseInt(GM_getValue(tag+':waitFor', '0'))) {
    console.log('sendQ called prematurely urls:'+sendQ.length());
    return;
  }
  //set a wait time in the future
  var min = 500, max = 3000;
  var waitMS = Math.floor(Math.random() * (max - min)) + min;
  console.log('setting wait '+waitMS+ ' for '+tag + ' len '+sendQ.length());
  GM_setValue(tag+':waitFor', (new Date().getTime()) + waitMS);

  //    console.log('urls:'+sendQ.length);
  //  console.log(' items pre shift '+sendQ.items);
  var sqCtx = sendQ.shift();
//  assertCtx(sqCtx, {url: "string", msg: "string"});

  //  console.log('tuple '+tuple);
  //  console.log(' items post shift '+sendQ.items);

  consoleMsg(sqCtx.msg);

  console.log('send get for '+sqCtx.url + ' msg '+sqCtx.msg);

  GM_xmlhttpRequest({
    method: 'GET',
    url: sqCtx.url,
    timeout: 15000,
    ontimeout: function(response) {
      console.log("ontimeout :"+response);
      consoleMsg("ae server timeout", "errMsg");
      ctxQueueGet(sqCtx);
    },
    onerror: function(response) {
      console.log("onerror :"+response);
    },
    onload: function(resp) {

        sqCtx.html = resp.responseText;
        sqCtx = ctxResponseDoc(sqCtx);

        //  every queue item can have its own onload callback
        // 
        try {
          assertCtx(sqCtx, {onload: "string"});

          aegis[sqCtx.onload](sqCtx);

        } catch(e) {
          //no onload function (or an error with it)
//          console.log(e);
        }

        if (sendQ.length() > 0) {
          var waitMS = 100;
          var nextTime = parseInt(GM_getValue(tag+':waitFor', '0'));
          var now = (new Date().getTime());
          if (nextTime > now) {
            waitMS = waitMS + (nextTime - now);
          }

          //call again after wait time
          alarm = window.setTimeout( function() { sendQueued(ctx); }, waitMS);

        } else {
          GM_deleteValue(tag+':waitFor');

          if (!ctx.doneMsg) {
            consoleMsg("empty send queue", "noticeMsg");
          } else {
            consoleMsg(ctx.doneMsg, "infoMsg");
            if (ctx.doneMsg.match(/completed scan/)) {
              document.title = ">" + document.title;
            }
          }
        }
      }  
  });
}

RegExp.quote = function(str) {
  return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

this.ctxQueueGet = function(ctx)
{
  assertCtx(ctx, {url: "string", msg: "string"});

  var re = new RegExp(RegExp.quote(serverURL));

  if (!ctx.url.match(re)) {
    ctx.url = serverURL + "/" + ctx.url;
  }

  //  unless specified, user wants ctxDispatch as onload callback
  //
  try {
    assertCtx(ctx, {onload: "string"});
  } catch(e) {
    ctx.onload = "ctxDispatchResponse";
  }
  sendQ.push(ctx);

}

this.scanRegion = function(region)
{
  var systems;
  if (region != null && region.match(/[A-Za-z][0-9]{2}:[0-9]{2}/)) {
    systems = GM_getValue("starMap:"+region);
    if (!exists(systems)) {
      var gal = region.match(/[A-Za-z][0-9]{2}/)[0];
      getGalaxyXML({galaxy: gal, callback: (function(region) { 
        return function() { scanRegion(region); }
      })(region)
      });
      return;
    }
    consoleMsg("scanning region "+region,"infoMsg");
  } else {
    consoleMsg("invalid region! ["+region+"]","errMsg");
    return;
  }
  var system = systems.split(":");
  for (var i = 0; i < system.length; i++)
  {
    var loc = region + ":" + system[i];
    ctxQueueGet({url: "map.aspx?loc="+loc, msg: "scanning system "+loc});
  }
  sendQueued({doneMsg: "completed scan of "+region});

  //  unsafeWindow.starsJS.watch(0, function () {
  //  var mapDelay = setTimeout( listViewableStars, 2000);
}

/********************************************************************************************************
*/

function ctxResponseDoc(ctx)
{
  console.log('ctxResponseDoc');
  var htmlParse = new DOMParser();

  ctx.doc = htmlParse.parseFromString(ctx.html, 'text/html');
  delete ctx.html;

  return ctx;
}

function responseDoc(html)
{
  console.log('responseDoc');
  var htmlParse = new DOMParser();

  var doc = htmlParse.parseFromString(html, 'text/html');
  return doc;
}

this.ctxDispatchResponse = function(ctx)
{
  console.log('ctxDispatchResponse');

  try {
    assertCtx(ctx, {doc: "object"});
  } catch(e) { console.log(e); return; }

  ctx.follow = "all";
  dispatch(ctx);

}

Error.prototype.shortstack = function()
{
  var stack = this.stack,
    re = new RegExp("(.*?)@.*\/(.*?):(.*?):(.*)", "g"),
    line, ss = [];

  while (line = re.exec(stack)) {
    ss.push(line[1] + "@" + line[2] + ":" + line[3]);
  }
  return ss.join("\n&nbsp;&nbsp;");
}

function dispatch(ctx) {
  try {
    assertCtx(ctx, {url: "string", doc: "object"});
  } catch(e) { console.log(e); return; }

  var url = decodeURIComponent(ctx.url),
      doc = ctx.doc,
      follow;
  if (typeof ctx.follow != "undefined") {
    follow = 1;
  }

  console.log('dispatching '+url );
  if (url.match(/(.+?)astroempires.com/)) {

    server = url.match(/\/(.+?).astroempires.com/)[1];
    server = server.replace(/\//, '');
    serverURL = 'http://' + server + '.astroempires.com';
    playerID = doc.getElementById('account').parentNode.getElementsByTagName("th")[1].innerHTML;
    serverTime = doc.getElementById('server-time').getAttribute('title');

    console.log('dispatch server '+server+' playerID '+playerID + ' time '+serverTime);
    console.log("fleet_ch1 "+GM_getValue("moveFleet:fleet_ch1:"+playerID, null));
  } else {
    return;
  }

  var aeData = { 
    "server": server,
    "time": serverTime,
    "playerID": playerID,
    add: function(tag, obj) {
      var id = null;
      //      console.log('aeData add');
      if (obj['id'] != null) {
        id = obj['id'];
        delete obj['id'];
      } else if (obj['location'] != null) {
        id = obj['location'];
      } else {
        console.log('invalid obj! tag: '+tag+" obj: "+JSON.stringify(obj));
        return;
      }
      if (this[tag] == null) {
        this[tag] = {};
      }
      this[tag][id] = obj;
    },
    hasData: function() {
      if (Object.keys(this).length > 5) {
        return 1;
      } else {
        //    console.log(JSON.stringify(aeData));
        return 0;
      }
    }
  };
  /*
     "fleet": {},
     "base": {},
     "astro": {},
     "player": {},
     */

  try {
    if (url.match(/astroempires\.com/)) {
      freeAccountRemoveAd(doc);
      replaceTime(doc);

      var daysOld = checkDaysOld(aeData, doc);
      if (daysOld != null) {
        sendQ.clear();
        consoleMsg("data is "+daysOld+" days old");
        //        return;
      }
      if (url.match(/view=scanners/)) { 
        parseScanner(aeData, url, doc, follow);

      } else if (url.match(/fleet\.aspx\?fleet=(\d+)&view=move/)) {
        //moveFleet(aeData, url, doc);

      } else if (url.match(/fleet\.aspx/)) {
        parseFleet(aeData, url, doc);

      } else if (url.match(/base\.aspx\?base=\d+/)) {
        parseBase(aeData, url, doc, follow);

      } else if (url.match(/map\.aspx\?loc=[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
        parseAstro(aeData, url, doc, follow);

      } else if (url.match(/map\.aspx\?loc=[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
        parseSystem(aeData, url, doc,follow);

      } else if (url.match(/map\.aspx\?(zoom=\d&)?loc=[A-Za-z][0-9]{2}:[0-9]{2}$/)) {
        //parseRegion();

      } else if (url.match(/empire\.aspx(\?view=bases_events)?$/)) {

        parseEmpire(aeData, url, doc, follow);

      } else if (url.match(/guild\.aspx/)) {
        parseGuild(aeData, url, doc, follow);
      }
      /*
  try {
    assertCtx(ctx, {ondispatch: "string"});

    console.log('calling ondispatch: ', ctx.ondispatch);
    aegis[ctx.ondispatch](ctx);
  };
*/

      if (aeData.hasData()) {
        sendToServer(aeData, aegisURLstore, ctx.ondispatch);
      }
    }
  } catch(e) {
    console.log(e);
    consoleMsg(e.shortstack(), "errMsg"); 
    /*
    var errorMsg = {
      "server": server,
      "time": serverTime,
      "playerID": playerID,
      "msg": e.message,
      "stack": e.stack,
      "url": url
    };
    sendToServer(errorMsg);
    */
  }
}

function doResources()
{
  var res = GM_getResourceText('aegis.css');
  GM_addStyle(res);
}

function CurrentServerTime()
{
  var mNow = moment(new Date());
  var localDiff = moment.duration(mNow.diff(mLocalStartTime));
  var mCurrentServerTime = moment(mServerTime).add(localDiff);
  return mCurrentServerTime;
}
/*  ctx.command = ["name", context]
 *  
 */
this.ctxRunCmd = function(ctx)
{
  console.log('ctxRunCmd ', ctx);
  assertCtx(ctx, {func: "string", ctx: "object"});
  var cmd = ctx.func;
  var cmdCtx = ctx.ctx;

  consoleMsg("processing command:<br>&nbsp;&nbsp;"+cmd + "("+ cmdCtx + ")");

  try {
    aegis[cmd](cmdCtx);
  } catch(e) {
    consoleMsg(e.message + "<br>"+cmd+"<br>"+e.shortstack, "errMsg");
  }

  if (cmd == "ctxQueueGet" && (! (isSending()))) {
    console.log('sendqueued');
    sendQueued({doneMsg: "done"});
  }

}

this.queryResponse = function(ctx)
{
  try {
    assertCtx(ctx, {response: "object"});

    for (i in ctx.response) {
      console.log("queryResponse: ",i, " => ", ctx.response[i]);
    }

  } catch(e) {}
  try {
    assertCtx(ctx, {command: "object"});

    console.log("server sent command: ", ctx.command);
    var cmdCtx = ctx.command;

    // come back here when the command finishes
    //   should the command result in a dispatch
    //
    cmdCtx.ctx.ondispatch = "queryResponse";

    ctxRunCmd(cmdCtx);
  } catch(e) {}
  console.log(ctx);

}

this.randomAstro = function(ctx)
{
  console.log('randomStar ',ctx);
  sendToServer({randomAstro: ctx.randomAstro}, aegisURLquery, "queryResponse"); 
}

$(document).ready(function() {

  checkSendBufferCache();

  dispatch({url: document.URL, doc: document});
  
  //randomAstro({randomAstro: "B39:55"});
});

/**************************************************************************************/

if (document.location.href.match(/(.+?)astroempires.com/)) {
  mServerTime = moment( document.getElementById('server-time').getAttribute('title'), 
    "YYYY/MM/DD HH:mm:ss");
  dStartTime = new Date();
  localTimeZoneOffset = dStartTime.getTimezoneOffset();
  mLocalStartTime = moment(dStartTime);
  console.log("Server Time: "+mServerTime.format('YYYY/MM/DD HH:mm:ss'));
  console.log("Local Time: "+mLocalStartTime.format('YYYY/MM/DD HH:mm:ss')
      + " tz offset:" + localTimeZoneOffset);
}


doResources();
setTabName();
checkForUpdate();

console.log("aegis loaded successfully");
