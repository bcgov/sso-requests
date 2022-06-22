"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[665],{76691:function(n,e,t){t.d(e,{Kk:function(){return b},MO:function(){return j},ZP:function(){return w},c4:function(){return m}});var r,i,o,a=t(50029),c=t(71383),s=t(87794),u=t.n(s),l=t(11163),d=t(37797),p=t(92814),h=t(51436),f=t(61165),x=t(37226),v=t(63055),g=t(85893),m=d.default.div(r||(r=(0,c.Z)(["\n  height: 100%;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  padding-right: 15px;\n  & > * {\n    margin-left: 15px;\n  }\n"]))),b=(0,d.default)(p.G)(i||(i=(0,c.Z)(["\n  cursor: ",";\n  ","\n  ",";\n"])),(function(n){return n.disabled?"not-allowed":"pointer"}),(function(n){return n.disabled?"color: #CACACA;":"color: inherit; &:hover { color: ".concat(n.activeColor||"#000","; }")}),(function(n){return n.isUnread?"color: ".concat(v.Uo):""})),j=d.default.div(o||(o=(0,c.Z)(["\n  height: 40px;\n  border-right: 2px solid #e3e3e3;\n"])));function w(n){var e=n.request,t=n.onDelete,r=n.defaultActiveColor,i=n.children,o=(0,l.useRouter)(),c=(e||{}).archived,s=!c&&!["pr","planned","submitted"].includes((null===e||void 0===e?void 0:e.status)||""),d=!c&&["draft","applied"].includes(e.status||""),p="delete-modal-".concat(null===e||void 0===e?void 0:e.id),j=function(){var n=(0,a.Z)(u().mark((function n(t){return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:if(t.stopPropagation(),d){n.next=3;break}return n.abrupt("return");case 3:return n.next=5,o.push("/request/".concat(e.id,"?status=").concat(e.status));case 5:case"end":return n.stop()}}),n)})));return function(e){return n.apply(this,arguments)}}(),w=function(){var n=(0,a.Z)(u().mark((function n(){return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:if(!["pr","planned","submitted"].includes((null===e||void 0===e?void 0:e.status)||"")){n.next=3;break}return n.abrupt("return");case 3:return n.next=5,(0,x.Jl)(e.id);case 5:window.location.hash="#",t&&t(e);case 7:case"end":return n.stop()}}),n)})));return function(){return n.apply(this,arguments)}}();return(0,g.jsxs)(g.Fragment,{children:[(0,g.jsxs)(m,{children:[i,(0,g.jsx)(b,{disabled:!d,icon:h.Xcf,role:"button","aria-label":"edit",onClick:j,activeColor:r,title:"Edit",size:"lg"}),(0,g.jsx)(b,{icon:h.$aW,role:"button","aria-label":"delete",onClick:function(){e.id&&s&&(window.location.hash=p)},disabled:!s,activeColor:v.Uo,title:"Delete",size:"lg"})]}),(0,g.jsx)(f.Z,{id:p,content:"You are about to delete this integration request. This action cannot be undone.",onConfirm:w,title:"Confirm Deletion",confirmText:"Delete"})]})}},83333:function(n,e,t){t.d(e,{Z:function(){return u}});var r,i=t(71383),o=(t(67294),t(37797)),a=t(31513),c=t(85893),s=o.default.div(r||(r=(0,i.Z)(["\n  margin-top: 20px;\n  max-height: calc(100vh - 250px);\n  overflow: auto;\n"])));function u(n){var e=n.events;return(0,c.jsx)(s,{children:e&&0!==e.length?e.map((function(n){return(0,c.jsxs)("div",{children:[(0,c.jsxs)("div",{children:[(0,c.jsx)("strong",{children:"Event Code: "}),n.eventCode]}),(0,c.jsxs)("div",{children:[(0,c.jsx)("strong",{children:"Created Time: "}),(e=n.createdAt,new Date(e).toLocaleString())]}),n.idirUserDisplayName&&(0,c.jsx)(c.Fragment,{children:(0,c.jsxs)("div",{children:[(0,c.jsx)("strong",{children:"Created By: "}),n.idirUserDisplayName]})}),n.details&&(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{children:(0,c.jsx)("strong",{children:"Details"})}),"request-update-success"===n.eventCode?(0,c.jsxs)(c.Fragment,{children:[(0,a.Sx)(n.details.changes),(0,c.jsx)("strong",{children:"Comment: "}),(0,c.jsx)("p",{children:n.details.comment})]}):(0,c.jsx)("pre",{children:(0,c.jsx)("code",{children:JSON.stringify(n.details||{},void 0,2)})})]}),(0,c.jsx)("hr",{})]},n.id);var e})):(0,c.jsx)("div",{children:"No events found"})})}},89405:function(n,e,t){var r,i=t(71383),o=t(37797),a=t(63055);e.Z=o.default.p(r||(r=(0,i.Z)(["\n  font-size: ",";\n  color: "," !important;\n"])),a.KN,a.we)},66886:function(n,e,t){t.d(e,{Z:function(){return h}});var r,i,o=t(71383),a=(t(67294),t(37797)),c=t(92814),s=t(51436),u=t(63055),l=t(85893),d=(0,a.default)(c.G)(r||(r=(0,o.Z)(["\n  margin-right: 10px;\n"]))),p=a.default.div(i||(i=(0,o.Z)(["\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n"])));function h(n){var e=n.children;return(0,l.jsxs)(p,{children:[(0,l.jsx)(d,{icon:s.sqG,color:u.UH,size:"2x"}),(0,l.jsx)("span",{children:(0,l.jsx)("em",{children:e})})]})}},73118:function(n,e,t){t.d(e,{H:function(){return s}});var r,i=t(71383),o=t(37797),a=t(2556),c=t(63055),s=(0,o.default)(a.Z)(r||(r=(0,i.Z)(["\n  .nav-link {\n    color: black !important;\n    height: 30px !important;\n    font-size: "," !important;\n    padding-top: 0; !important;\n    border-top: unset !important;\n    border-left: unset !important;\n    border-right: unset !important;\n  }\n  .nav-link.active {\n    background-color: unset !important;\n    border-bottom: 3px solid orange;\n    font-weight: 600;\n  }\n"])),c.CA)},67138:function(n,e,t){var r,i=t(71383),o=t(37797),a=t(63055),c=o.default.h3(r||(r=(0,i.Z)(["\n  color: #777777;\n  font-size: ",";\n  font-weight: bold;\n  min-height: 30px;\n  border-bottom: 1px solid #707070;\n  margin-bottom: 5px;\n  overflow: wrap;\n"])),a.CA);e.Z=c},70300:function(n,e,t){var r,i=t(71383),o=t(37797).default.div(r||(r=(0,i.Z)(["\n  min-height: 44px;\n  border-bottom: 1px solid #707070;\n  margin-bottom: 12px;\n  padding-bottom: 5px;\n  overflow: wrap;\n"])));e.Z=o},39550:function(n,e,t){var r,i=t(71383),o=t(37797);e.Z=o.default.ul(r||(r=(0,i.Z)(["\n  list-style-type: none;\n  margin: 0;\n  position: relative;\n\n  & li {\n    border-bottom: 1px solid #d4d4d4;\n    & svg.svg-inline--fa {\n      position: absolute;\n      right: 0;\n    }\n\n    & div.icon {\n      position: absolute;\n      right: 0;\n      bottom: 5px;\n    }\n  }\n"])))},332:function(n,e,t){t.d(e,{Z:function(){return B}});var r,i,o,a,c=t(71383),s=t(51479),u=t(67138),l=t(92814),d=t(51436),p=t(74150),h=t(37797),f=t(63055),x=t(89405),v=t(11752),g=t(39550),m=t(66886),b=t(85893),j=((0,v.default)()||{}).publicRuntimeConfig,w=(void 0===j?{}:j).app_env,Z=(0,h.default)(u.Z)(r||(r=(0,c.Z)(["\n  border-bottom: none;\n  margin-top: 10px;\n"]))),C=(0,h.default)(Z)(i||(i=(0,c.Z)(["\n  font-size: 14px;\n"]))),k=h.default.a(o||(o=(0,c.Z)(["\n  color: ",";\n"])),f.nc),y=(0,h.default)(s.Z)(a||(a=(0,c.Z)(["\n  margin-bottom: 10px;\n"]))),P=function(n){switch(n){case"submitted":return 0;case"pr":return 33;case"planned":return 66;default:return 100}};function B(n){var e=n.selectedRequest,t=n.title,r=e.status,i=e.prNumber,o=e.updatedAt,a=function(n){switch(n){case"prFailed":case"planFailed":case"applyFailed":return!0;default:return!1}}(r),c=function(n){switch(n){case"submitted":return"Process request submitted...";case"pr":return"Pull request created...";case"planned":return"Terraform plan succeeded...";case"prFailed":case"planFailed":case"applyFailed":return"An error has occurred";default:return""}}(r),s=new Date(o||"").toLocaleString(),u=[(0,b.jsxs)("li",{children:["Process request submitted",(0,b.jsx)(l.G,{icon:d.f8k,color:"#00C45B"})]},"1")],h=function(n){switch(n){case"submitted":default:return 0;case"pr":return 1;case"prFailed":return 2;case"planned":return 3;case"planFailed":return 4;case"applied":return 5;case"applyFailed":return 6}}(r);if(h<1)u.push((0,b.jsxs)("li",{children:["Pull request created",(0,b.jsx)(l.G,{icon:d.LM3,color:"#B2B2B2",spin:!0})]},"2"));else if(2===h)u.push((0,b.jsxs)("li",{children:["Pull request creation failed",(0,b.jsx)(l.G,{icon:d.nYk,color:"#FF0000"})]},"2"));else{var f="production"===w?"https://github.com/bcgov/sso-terraform/pull/".concat(i):"https://github.com/bcgov/sso-terraform-dev/pull/".concat(i);u.push((0,b.jsxs)("li",{children:["Pull request created (",(0,b.jsx)(p.ZP,{external:!0,href:f,children:"link"}),")",(0,b.jsx)(l.G,{icon:d.f8k,color:"#00C45B"})]},"2"))}return h<3?u.push((0,b.jsxs)("li",{children:["Terraform plan succeeded",(0,b.jsx)(l.G,{icon:d.LM3,color:"#B2B2B2",spin:!0})]},"3")):4===h?u.push((0,b.jsxs)("li",{children:["Terraform plan failed",(0,b.jsx)(l.G,{icon:d.nYk,color:"#FF0000"})]},"3")):u.push((0,b.jsxs)("li",{children:["Terraform plan succeeded",(0,b.jsx)(l.G,{icon:d.f8k,color:"#00C45B"})]},"3")),h<5?u.push((0,b.jsxs)("li",{children:["Request processed",(0,b.jsx)(l.G,{icon:d.LM3,color:"#B2B2B2",spin:!0})]},"4")):6===h?u.push((0,b.jsxs)("li",{children:["Request failed",(0,b.jsx)(l.G,{icon:d.nYk,color:"#FF0000"})]},"4")):u.push((0,b.jsxs)("li",{children:["Request processed",(0,b.jsx)(l.G,{icon:d.f8k,color:"#00C45B"})]},"4")),(0,b.jsxs)(b.Fragment,{children:[t&&(0,b.jsx)(Z,{children:t}),(0,b.jsx)(C,{children:c}),(0,b.jsx)(y,{now:P(r),animated:!0,variant:a?"danger":void 0}),(0,b.jsxs)(x.Z,{children:["Last updated at ",s]}),(0,b.jsx)(g.Z,{children:u}),(0,b.jsx)("br",{}),(0,b.jsxs)(m.Z,{children:["If there is an error or the process takes longer than 20 mins then, please contact our SSO support team by"," ",(0,b.jsx)(k,{href:"https://chat.developer.gov.bc.ca/channel/sso",target:"_blank",title:"Rocket Chat",children:"Rocket.Chat"})," ","or"," ",(0,b.jsx)(k,{href:"mailto:bcgov.sso@gov.bc.ca",title:"Pathfinder SSO",target:"blank",children:"Email us"})," "]})]})}},96807:function(n,e,t){var r,i,o,a,c,s,u=t(71383),l=t(67294),d=t(37797),p=t(96486),h=t(11915),f=t(4826),x=t(35611),v=t(64735),g=t(52205),m=t(88214),b=t(70300),j=t(11177),w=t(65837),Z=t(76457),C=(t(80770),t(63055)),k=t(85893),y=(0,d.default)(h.ZP)(r||(r=(0,u.Z)(["\n  input {\n    width: 100%;\n  }\n"]))),P=(0,d.default)(j.NU)(i||(i=(0,u.Z)(["\n  font-size: 0.9rem;\n\n  .dropdown-container {\n    border: 1.8px solid black !important;\n\n    .dropdown-heading {\n      height: 32px;\n    }\n  }\n"]))),B=(0,d.default)(g.Z)(o||(o=(0,u.Z)(["\n  margin: 0 !important;\n  & li {\n    margin: 0 !important;\n  }\n"]))),F=d.default.label(a||(a=(0,u.Z)(["\n  cursor: pointer;\n  font-weight: bold;\n  & * {\n    font-weight: normal;\n  }\n"]))),S=d.default.li(c||(c=(0,u.Z)(["\n  padding-left: 5px;\n  line-height: 40px;\n"]))),q=d.default.div(s||(s=(0,u.Z)(["\n  display: grid;\n  grid-template-columns:\n    ","\n    &> * {\n    margin-right: 10px;\n    white-space: nowrap;\n  }\n"])),(function(n){return"repeat(".concat(n.itemsLength,", 1fr);")})),A={allItemsAreSelected:"All",selectSomeItems:""},z=function(n){for(var e=n.rowCount,t=n.limit,r=n.page,i=n.onPage,o=n.onPrev,a=n.onNext,c=parseInt(String((e-1)/t+1)),s=[(0,k.jsx)(g.Z.Item,{disabled:1===r,onClick:function(){return o()},children:"Previous"},"prev")],u=function(n){s.push((0,k.jsx)(g.Z.Item,{active:n===r,onClick:function(){return i(n)},children:n},n)),c===n&&s.push((0,k.jsx)(g.Z.Item,{disabled:r===n,onClick:function(){return a()},children:"Next"},"next"))},l=1;l<=c;l++)u(l);return(0,k.jsx)(k.Fragment,{children:s})},L=function(n){var e=n.rowCount,t=n.limit,r=n.page,i=n.onPrev,o=n.onNext,a=parseInt(String((e-1)/t+1)),c=parseInt(String((r-1)*t+1)),s=c+t-1;return s>e&&(s=e),(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(g.Z.Item,{disabled:1===r,onClick:function(){return i(r-1)},children:"Previous"},"prev"),(0,k.jsx)(g.Z.Item,{disabled:r===a,onClick:function(){return o(r+1)},children:"Next"},"next"),(0,k.jsx)(S,{children:"".concat(c,"-").concat(s," of ").concat(e)})]})};e.Z=function(n){var e=n.variant,t=void 0===e?"medium":e,r=n.headers,i=n.children,o=n.pagination,a=void 0!==o&&o,c=n.onSearch,s=void 0===c?p.noop:c,u=n.onEnter,d=void 0===u?p.noop:u,h=n.filters,g=void 0===h?[]:h,j=n.searchLocation,S=void 0===j?"left":j,N=n.totalColSpan,U=void 0===N?14:N,G=n.searchColSpan,T=void 0===G?4:G,I=n.filterColSpan,R=void 0===I?10:I,D=n.showContent,E=void 0===D||D,M=n.headerAlign,_=void 0===M?"center":M,O=n.headerGutter,J=void 0===O?[]:O,K=n.onLimit,X=void 0===K?p.noop:K,Y=n.onPage,H=n.onPrev,W=void 0===H?p.noop:H,$=n.onNext,Q=void 0===$?p.noop:$,V=n.pageLimits,nn=void 0===V?[]:V,en=n.searchKey,tn=void 0===en?"":en,rn=n.searchPlaceholder,on=void 0===rn?"Search...":rn,an=n.page,cn=void 0===an?1:an,sn=n.limit,un=void 0===sn?10:sn,ln=n.rowCount,dn=void 0===ln?10:ln,pn=n.loading,hn=(0,l.useState)(tn),fn=hn[0],xn=hn[1],vn=dn||un;dn>un&&(vn=un);var gn,mn=(0,k.jsx)("td",{colSpan:100,children:(0,k.jsx)("div",{style:{height:"".concat(vn*(C.eX+C.gM)-C.gM,"px"),paddingTop:"10px"},children:(0,k.jsx)(w.TextBlock,{rows:2*vn,color:"#CCC"})})}),bn=(0,k.jsx)(v.ZP.Col,{span:T,children:(0,k.jsx)(v.ZP,{cols:12,children:(0,k.jsxs)(v.ZP.Row,{gutter:[5,0],align:"center",children:[(0,k.jsx)(v.ZP.Col,{span:8,children:(0,k.jsx)(y,{type:"text",size:"small",maxLength:"1000",placeholder:on,value:fn,onChange:function(n){xn(n.target.value)},onKeyUp:function(n){"Enter"===n.key&&d(fn)}})}),(0,k.jsx)(v.ZP.Col,{span:4,children:(0,k.jsx)(f.ZP,{type:"button",size:"small",onClick:function(){s(fn)},children:"Search"})})]})})}),jn=(0,k.jsx)(v.ZP.Col,{span:R,style:{textAlign:"right"},children:(0,k.jsx)(q,{itemsLength:g.length,children:g.map((function(n,e){return(0,k.jsx)(F,{children:n.multiselect?(0,k.jsxs)(k.Fragment,{children:[n.label,(0,k.jsx)(P,{className:"multiselect",options:n.options,value:Array.isArray(n.value)?n.value:[],onChange:n.onChange,labelledBy:"Select",hasSelectAll:!1,overrideStrings:A})]}):(0,k.jsxs)(k.Fragment,{children:[n.label,(0,k.jsx)(x.ZP,{"data-test-id":n.key,onChange:function(e){return(null===n||void 0===n?void 0:n.onChange)&&n.onChange(e.target.value)},value:"string"===typeof n.value?n.value:"",children:n.options.map((function(n){return(0,k.jsx)("option",{value:n.value,children:n.label},Array.isArray(n.value)?JSON.stringify(n.value):n.value)}))})]})},e)}))})}),wn=null,Zn=null;return"left"===S?(wn=bn,Zn=jn):(wn=jn,Zn=bn),(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(b.Z,{children:(0,k.jsx)(v.ZP,{cols:U,children:(0,k.jsxs)(v.ZP.Row,{collapse:"1160",gutter:J,align:_,children:[wn,Zn]})})}),E&&(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(m.Z,{variant:t,children:(0,k.jsxs)(Z.Z,{ready:!pn||!1,showLoadingAnimation:!0,customPlaceholder:mn,children:[(0,k.jsx)("thead",{children:(0,k.jsx)("tr",{children:r.map((function(n,e){return(0,k.jsx)("th",{style:n.style||{},children:n.name},e)}))})}),(0,k.jsx)("tbody",{children:i})]})}),a&&dn>0&&(0,k.jsx)(v.ZP,{cols:12,children:(0,k.jsxs)(v.ZP.Row,{collapse:"992",gutter:[],align:"center",children:[(0,k.jsx)(v.ZP.Col,{span:8,children:(0,k.jsx)(B,{children:Y?(0,k.jsx)(z,{rowCount:dn,limit:un,page:cn,onPage:Y}):(0,k.jsx)(L,{rowCount:dn,limit:un,page:cn,onPrev:W,onNext:Q})})}),(null===nn||void 0===nn?void 0:nn.length)>0&&(0,k.jsx)(v.ZP.Col,{span:4,style:{textAlign:"right"},children:(0,k.jsx)(x.ZP,{style:{display:"inline-block",width:"160px"},value:String(un),onChange:function(n){X(Number(n.target.value))},children:(gn=nn,(0,k.jsx)(k.Fragment,{children:gn.map((function(n){return(0,k.jsx)("option",{value:n.value,children:n.text},n.value)}))}))})})]})})]})]})}},88214:function(n,e,t){var r,i=t(71383),o=t(37797),a=t(63055),c=o.default.table(r||(r=(0,i.Z)(["\n  width: 100%;\n  -webkit-box-shadow: none;\n  box-shadow: none;\n  text-align: left;\n  border-collapse: separate;\n  border-spacing: 0 ","px;\n\n  & thead {\n    font-size: 16px;\n    color: black;\n\n    & th {\n      min-width: ",";\n    }\n  }\n\n  & tbody {\n    font-size: ",";\n    tr {\n      height: ",";\n      background-color: #f8f8f8;\n      ","\n    }\n  }\n\n  td:first-child {\n    padding-left: 1em;\n    text-align: left;\n  }\n\n  & th,\n  & td {\n    border: none;\n    padding: 0;\n    overflow: hidden;\n  }\n\n  & th.w60,\n  & td.w60 {\n    width: 60px;\n  }\n\n  & th.min-width-60,\n  & td.min-width-60 {\n    min-width: 60px;\n  }\n"])),a.gM,(function(n){return"mini"===n.variant?"30px":"140px"}),(function(n){return"mini"===n.variant?"14px":"16px"}),(function(n){return"mini"===n.variant?"".concat(a.ZW,"px"):"".concat(a.eX,"px")}),(function(n){return!n.readOnly&&"\n        &:hover {\n          background-color: ".concat(a.uB,";\n          cursor: pointer;\n        }\n        &.active {\n          background-color: ").concat(a.uB,";\n          font-weight: bold;\n          border: 2px solid #9fadc0 !important;\n        }\n      ")}));e.Z=c},76944:function(n,e,t){t.d(e,{v:function(){return c}});var r=t(50029),i=t(87794),o=t.n(i),a=t(21963),c=function(){var n=(0,r.Z)(o().mark((function n(e){var t;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,a.e.post("events",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[t,null]);case 7:return n.prev=7,n.t0=n.catch(0),console.error(n.t0),n.abrupt("return",[null,n.t0]);case 11:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}()},37226:function(n,e,t){t.d(e,{A_:function(){return l},H0:function(){return p},Jl:function(){return x},Uw:function(){return v},WN:function(){return f},XJ:function(){return d},hG:function(){return u},zD:function(){return h}});var r=t(50029),i=t(87794),o=t.n(i),a=t(21963),c=t(96486),s=t(31513),u=function(){var n=(0,r.Z)(o().mark((function n(e){var t;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,a.e.post("requests",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[(0,s.UB)(t),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,a.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),l=function(){var n=(0,r.Z)(o().mark((function n(e){var t;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,a.e.post("request",{requestId:(0,c.isString)(e)?parseInt(e):e}).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[(0,s.UB)(t),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,a.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),d=function(){var n=(0,r.Z)(o().mark((function n(){var e,t,r,i=arguments;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return e=i.length>0&&void 0!==i[0]?i[0]:"active",t={params:{include:e}},n.prev=2,n.next=5,a.e.get("requests",t).then((function(n){return n.data}));case 5:return r=n.sent,r=(0,c.orderBy)(r,["createdAt"],["desc"]),n.abrupt("return",[r.map(s.UB),null]);case 10:return n.prev=10,n.t0=n.catch(2),n.abrupt("return",(0,a.z)(n.t0));case 13:case"end":return n.stop()}}),n,null,[[2,10]])})));return function(){return n.apply(this,arguments)}}(),p=function(){var n=(0,r.Z)(o().mark((function n(e){var t;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,a.e.get("team-integrations/".concat(e)).then((function(n){return n.data}));case 3:return t=n.sent,t=(0,c.orderBy)(t,["createdAt"],["desc"]),n.abrupt("return",[t.map(s.UB),null]);case 8:return n.prev=8,n.t0=n.catch(0),n.abrupt("return",(0,a.z)(n.t0));case 11:case"end":return n.stop()}}),n,null,[[0,8]])})));return function(e){return n.apply(this,arguments)}}(),h=function(){var n=(0,r.Z)(o().mark((function n(e){var t;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,a.e.post("requests-all",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[{count:t.count,rows:t.rows.map(s.UB)},null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,a.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),f=function(){var n=(0,r.Z)(o().mark((function n(e){var t,r,i,c=arguments;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return t=c.length>1&&void 0!==c[1]&&c[1],n.prev=1,r="requests",t&&(r="".concat(r,"?submit=true")),e.devLoginTitle=e.devLoginTitle||"",e.testLoginTitle=e.testLoginTitle||"",e.prodLoginTitle=e.prodLoginTitle||"",n.next=9,a.e.put(r,e).then((function(n){return n.data}));case 9:return i=n.sent,n.abrupt("return",[(0,s.UB)(i),null]);case 13:return n.prev=13,n.t0=n.catch(1),n.abrupt("return",(0,a.z)(n.t0));case 16:case"end":return n.stop()}}),n,null,[[1,13]])})));return function(e){return n.apply(this,arguments)}}(),x=function(){var n=(0,r.Z)(o().mark((function n(e){var t;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,a.e.delete("requests",{params:{id:e}}).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[t,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,a.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}(),v=function(){var n=(0,r.Z)(o().mark((function n(e){var t;return o().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,a.e.put("request-metadata",e).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[(0,s.UB)(t),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,a.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(e){return n.apply(this,arguments)}}()}}]);