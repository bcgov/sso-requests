"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[925],{45349:function(n,e,t){t.d(e,{Z:function(){return s}});var r,i=t(71383),a=(t(67294),t(85444)),u=t(23761),o=t(85893),c=a.default.div(r||(r=(0,i.Z)(["\n  margin-top: 20px;\n  max-height: calc(100vh - 250px);\n  overflow: auto;\n"])));function s(n){var e=n.events;return(0,o.jsx)(c,{children:e&&0!==e.length?e.map((function(n){return(0,o.jsxs)("div",{children:[(0,o.jsxs)("div",{children:[(0,o.jsx)("strong",{children:"Event Code: "}),n.eventCode]}),(0,o.jsxs)("div",{children:[(0,o.jsx)("strong",{children:"Created Time: "}),(e=n.createdAt,new Date(e).toLocaleString())]}),n.idirUserDisplayName&&(0,o.jsx)(o.Fragment,{children:(0,o.jsxs)("div",{children:[(0,o.jsx)("strong",{children:"Created By: "}),n.idirUserDisplayName]})}),n.details&&(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("div",{children:(0,o.jsx)("strong",{children:"Details"})}),"request-update-success"===n.eventCode?(0,o.jsxs)(o.Fragment,{children:[(0,u.Sx)(n.details.changes),(0,o.jsx)("strong",{children:"Comment: "}),(0,o.jsx)("p",{children:n.details.comment})]}):(0,o.jsx)("pre",{children:(0,o.jsx)("code",{children:JSON.stringify(n.details||{},void 0,2)})})]}),(0,o.jsx)("hr",{})]},n.id);var e})):(0,o.jsx)("div",{children:"No events found"})})}},9431:function(n,e,t){var r,i=t(71383),a=t(85444).default.div(r||(r=(0,i.Z)(["\n  min-height: 44px;\n  border-bottom: 1px solid #707070;\n  margin-bottom: 12px;\n  padding-bottom: 5px;\n  overflow: wrap;\n"])));e.Z=a},15338:function(n,e,t){var r,i,a,u,o,c,s=t(71383),l=t(67294),d=t(85444),p=t(34798),h=t.n(p),v=t(11915),f=t(4826),x=t(35611),g=t(64735),m=t(53918),j=t(85330),w=t(9431),b=t(25542),Z=t(11177),C=t(65837),y=t(76457),k=(t(86389),t(64575)),P=t(85893),S=((0,d.default)(v.default)(r||(r=(0,s.Z)(["\n  input {\n    width: 100%;\n  }\n"]))),(0,d.default)(Z.NU)(i||(i=(0,s.Z)(["\n  font-size: 0.9rem;\n\n  .dropdown-container {\n    border: 1.8px solid black !important;\n\n    .dropdown-heading {\n      height: 32px;\n    }\n  }\n"])))),A=(0,d.default)(m.Z)(a||(a=(0,s.Z)(["\n  margin: 0 !important;\n  & li {\n    margin: 0 !important;\n  }\n"]))),N=d.default.label(u||(u=(0,s.Z)(["\n  cursor: pointer;\n  font-weight: bold;\n  & * {\n    font-weight: normal;\n  }\n"]))),L=d.default.li(o||(o=(0,s.Z)(["\n  padding-left: 5px;\n  line-height: 40px;\n"]))),z=d.default.div(c||(c=(0,s.Z)(["\n  display: grid;\n  grid-template-columns:\n    ","\n    &> * {\n    margin-right: 10px;\n    white-space: nowrap;\n  }\n"])),(function(n){return"repeat(".concat(n.itemsLength,", 1fr);")})),B={allItemsAreSelected:"All",selectSomeItems:""},F=function(n){for(var e=n.rowCount,t=n.limit,r=n.page,i=n.onPage,a=n.onPrev,u=n.onNext,o=parseInt(String((e-1)/t+1)),c=[(0,P.jsx)(m.Z.Item,{disabled:1===r,onClick:function(){return a()},children:"Previous"},"prev")],s=function(n){c.push((0,P.jsx)(m.Z.Item,{active:n===r,onClick:function(){return i(n)},children:n},n)),o===n&&c.push((0,P.jsx)(m.Z.Item,{disabled:r===n,onClick:function(){return u()},children:"Next"},"next"))},l=1;l<=o;l++)s(l);return(0,P.jsx)(P.Fragment,{children:c})},I=function(n){var e=n.rowCount,t=n.limit,r=n.page,i=n.onPrev,a=n.onNext,u=parseInt(String((e-1)/t+1)),o=parseInt(String((r-1)*t+1)),c=o+t-1;return c>e&&(c=e),(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(m.Z.Item,{disabled:1===r,onClick:function(){return i(r-1)},children:"Previous"},"prev"),(0,P.jsx)(m.Z.Item,{disabled:r===u,onClick:function(){return a(r+1)},children:"Next"},"next"),(0,P.jsx)(L,{children:"".concat(o,"-").concat(c," of ").concat(e)})]})};e.Z=function(n){var e=n.variant,t=void 0===e?"medium":e,r=n.headers,i=n.children,a=n.pagination,u=void 0!==a&&a,o=n.onSearch,c=void 0===o?h():o,s=n.onEnter,d=void 0===s?h():s,p=n.filters,v=void 0===p?[]:p,m=n.searchLocation,Z=void 0===m?"left":m,L=n.totalColSpan,U=void 0===L?14:L,T=n.searchColSpan,q=void 0===T?4:T,E=n.filterColSpan,D=void 0===E?10:E,_=n.showFilters,J=void 0===_||_,R=n.showContent,G=void 0===R||R,K=n.headerAlign,M=void 0===K?"center":K,O=n.headerGutter,X=void 0===O?[]:O,H=n.onLimit,W=void 0===H?h():H,Q=n.onPage,V=n.onPrev,Y=void 0===V?h():V,$=n.onNext,nn=void 0===$?h():$,en=n.pageLimits,tn=void 0===en?[]:en,rn=n.searchKey,an=void 0===rn?"":rn,un=n.searchPlaceholder,on=void 0===un?"Search...":un,cn=n.searchTooltip,sn=void 0===cn?"":cn,ln=n.page,dn=void 0===ln?1:ln,pn=n.limit,hn=void 0===pn?10:pn,vn=n.rowCount,fn=void 0===vn?10:vn,xn=n.loading,gn=(0,l.useState)(an),mn=gn[0],jn=gn[1],wn=fn||hn;fn>hn&&(wn=hn);var bn,Zn=(0,P.jsx)("td",{colSpan:100,children:(0,P.jsx)("div",{style:{height:"".concat(wn*(k.eX+k.gM)-k.gM,"px"),paddingTop:"10px"},children:(0,P.jsx)(C.TextBlock,{rows:2*wn,color:"#CCC"})})}),Cn=(0,P.jsx)(g.ZP.Col,{span:q,children:(0,P.jsx)(g.ZP,{cols:12,children:(0,P.jsxs)(g.ZP.Row,{gutter:[5,0],align:"center",children:[(0,P.jsx)(g.ZP.Col,{span:8,children:(0,P.jsx)(j.E1,{type:"text",size:"small",maxLength:"1000",placeholder:on,value:mn,onChange:function(n){jn(n.target.value)},onKeyUp:function(n){"Enter"===n.key&&d(mn)}})}),(0,P.jsx)(g.ZP.Col,{span:4,children:(0,P.jsx)(b.Z,{content:sn,children:(0,P.jsx)(f.default,{type:"button",size:"small",onClick:function(){c(mn)},children:"Search"})})})]})})}),yn=(0,P.jsx)(g.ZP.Col,{span:D,style:{textAlign:"right"},children:(0,P.jsx)(z,{itemsLength:v.length,children:v.map((function(n,e){return(0,P.jsx)(N,{children:n.multiselect?(0,P.jsxs)(P.Fragment,{children:[n.label,(0,P.jsx)(S,{className:"multiselect",options:n.options,value:Array.isArray(n.value)?n.value:[],onChange:n.onChange,labelledBy:"Select",hasSelectAll:!1,overrideStrings:B})]}):(0,P.jsxs)(P.Fragment,{children:[n.label,(0,P.jsx)(x.default,{"data-test-id":n.key,onChange:function(e){return(null===n||void 0===n?void 0:n.onChange)&&n.onChange(e.target.value)},value:"string"===typeof n.value?n.value:"",children:n.options.map((function(n){return(0,P.jsx)("option",{value:n.value,children:n.label},Array.isArray(n.value)?JSON.stringify(n.value):n.value)}))})]})},e)}))})}),kn=null,Pn=null;return"left"===Z?(kn=Cn,Pn=yn):(kn=yn,Pn=Cn),(0,P.jsxs)(P.Fragment,{children:[J&&(0,P.jsx)(w.Z,{children:(0,P.jsx)(g.ZP,{cols:U,children:(0,P.jsxs)(g.ZP.Row,{collapse:"1160",gutter:X,align:M,children:[kn,Pn]})})}),G&&(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(j.iA,{variant:t,children:(0,P.jsxs)(y.Z,{ready:!xn||!1,showLoadingAnimation:!0,customPlaceholder:Zn,children:[(0,P.jsx)("thead",{children:(0,P.jsx)("tr",{children:r.map((function(n,e){return(0,P.jsx)("th",{style:n.style||{},children:n.label},e)}))})}),(0,P.jsx)("tbody",{children:i})]})}),u&&fn>0&&(0,P.jsx)(g.ZP,{cols:12,children:(0,P.jsxs)(g.ZP.Row,{collapse:"992",gutter:[],align:"center",children:[(0,P.jsx)(g.ZP.Col,{span:8,children:(0,P.jsx)(A,{children:Q?(0,P.jsx)(F,{rowCount:fn,limit:hn,page:dn,onPage:Q}):(0,P.jsx)(I,{rowCount:fn,limit:hn,page:dn,onPrev:Y,onNext:nn})})}),(null===tn||void 0===tn?void 0:tn.length)>0&&(0,P.jsx)(g.ZP.Col,{span:4,style:{textAlign:"right"},children:(0,P.jsx)(x.default,{style:{display:"inline-block",width:"160px"},value:String(hn),onChange:function(n){W(Number(n.target.value))},children:(bn=tn,(0,P.jsx)(P.Fragment,{children:bn.map((function(n){return(0,P.jsx)("option",{value:n.value,children:n.text},n.value)}))}))})})]})})]})]})}},25506:function(n,e,t){t.d(e,{F:function(){return r}});var r={"browser-login":"Browser Login","service-account":"Service Account",both:"Browser Login & Service Account"}},69413:function(n,e,t){t.d(e,{v:function(){return o}});var r=t(50029),i=t(87794),a=t.n(i),u=t(62297),o=function(){var n=(0,r.Z)(a().mark((function n(e){var t;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,u.e.post("events",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[t,null]);case 7:return n.prev=7,n.t0=n.catch(0),console.error(n.t0),n.abrupt("return",[null,n.t0]);case 11:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}()},89704:function(n,e,t){t.d(e,{A_:function(){return f},H0:function(){return g},Jl:function(){return w},Uw:function(){return b},WN:function(){return j},XJ:function(){return x},hG:function(){return v},zD:function(){return m}});var r=t(50029),i=t(87794),a=t.n(i),u=t(62297),o=t(75316),c=t.n(o),s=t(25751),l=t.n(s),d=t(76427),p=t.n(d),h=t(23761),v=function(){var n=(0,r.Z)(a().mark((function n(e){var t;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,u.e.post("requests",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[(0,h.UB)(t),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,u.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),f=function(){var n=(0,r.Z)(a().mark((function n(e){var t;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,u.e.post("request",{requestId:l()(e)?parseInt(e):e}).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[(0,h.UB)(t),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,u.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),x=function(){var n=(0,r.Z)(a().mark((function n(){var e,t,r,i=arguments;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return e=i.length>0&&void 0!==i[0]?i[0]:"active",t={params:{include:e}},n.prev=2,n.next=5,u.e.get("requests",t).then((function(n){return n.data}));case 5:return r=n.sent,r=c()(r,["createdAt"],["desc"]),n.abrupt("return",[r.map(h.UB),null]);case 10:return n.prev=10,n.t0=n.catch(2),n.abrupt("return",(0,u.z)(n.t0));case 13:case"end":return n.stop()}}),n,null,[[2,10]])})));return function(){return n.apply(this,arguments)}}(),g=function(){var n=(0,r.Z)(a().mark((function n(e){var t;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,u.e.get("team-integrations/".concat(e)).then((function(n){return n.data}));case 3:return t=n.sent,t=c()(t,["createdAt"],["desc"]),n.abrupt("return",[t.map(h.UB),null]);case 8:return n.prev=8,n.t0=n.catch(0),n.abrupt("return",(0,u.z)(n.t0));case 11:case"end":return n.stop()}}),n,null,[[0,8]])})));return function(e){return n.apply(this,arguments)}}(),m=function(){var n=(0,r.Z)(a().mark((function n(e){var t;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,u.e.post("requests-all",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[{count:t.count,rows:t.rows.map(h.UB)},null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,u.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),j=function(){var n=(0,r.Z)(a().mark((function n(e){var t,r,i,o=arguments;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return t=o.length>1&&void 0!==o[1]&&o[1],n.prev=1,r="requests",t&&(r="".concat(r,"?submit=true")),(e=p()(e,["user","lastChanges"])).devLoginTitle=e.devLoginTitle||"",e.testLoginTitle=e.testLoginTitle||"",e.prodLoginTitle=e.prodLoginTitle||"",n.next=10,u.e.put(r,e).then((function(n){return n.data}));case 10:return i=n.sent,n.abrupt("return",[(0,h.UB)(i),null]);case 14:return n.prev=14,n.t0=n.catch(1),n.abrupt("return",(0,u.z)(n.t0));case 17:case"end":return n.stop()}}),n,null,[[1,14]])})));return function(e){return n.apply(this,arguments)}}(),w=function(){var n=(0,r.Z)(a().mark((function n(e){var t;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,u.e.delete("requests",{params:{id:e}}).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[t,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,u.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),b=function(){var n=(0,r.Z)(a().mark((function n(e){var t;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,u.e.put("request-metadata",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[(0,h.UB)(t),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,u.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}()}}]);