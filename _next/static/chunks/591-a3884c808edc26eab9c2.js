(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[591],{10633:function(n,r,e){"use strict";var t=e(27261);function u(){var n=(0,t.Z)(["\n  color: #dc3545;\n  margin: 0;\n  padding: 0;\n"]);return u=function(){return n},n}var a=e(29163).default.span(u());r.Z=a},65764:function(n,r,e){"use strict";var t=e(85893),u=e(809),a=e.n(u),c=e(64121),s=e(92447),i=e(27261),o=e(67294),l=e(11915),p=e(29163),f=e(85330),d=e(38073),v=e(31607),m=e(70316),h=e(10633),b=e(89779);function x(){var n=(0,i.Z)(["\n  display: flex;\n  justify-content: space-between;\n  margin-top: 20px;\n  & button {\n    min-width: 180px;\n  }\n"]);return x=function(){return n},n}var w=p.default.div(x()),g={idirEmail:"",role:"member",id:(new Date).getTime()};r.Z=(0,m.hU)((function(n){var r=n.onSubmit,e=n.currentUser,u=n.alert,i=(0,o.useState)([g]),p=i[0],m=i[1],x=(0,o.useState)(""),j=x[0],y=x[1],Z=(0,o.useState)(!1),k=Z[0],z=Z[1],O=(0,o.useState)(),C=O[0],P=O[1],U=function(n){var r={members:[]},e=!1;return n.name||(r.name="Please enter a name",e=!0),n.members.forEach((function(n,t){n.idirEmail||(r.members[t]="Please enter an email",e=!0)})),e?r:(P(void 0),null)},E=function(){var n=(0,s.Z)(a().mark((function n(){var e,t,s,i,o,l;return a().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:if(!(t=U(e={name:j,members:p}))){n.next=4;break}return n.abrupt("return",P(t));case 4:return z(!0),n.next=7,(0,d.Cm)(e);case 7:if(s=n.sent,i=(0,c.Z)(s,2),o=i[0],(l=i[1])?u.show({variant:"danger",fadeOut:1e4,closable:!0,content:l}):u.show({variant:"success",fadeOut:1e4,closable:!0,content:"Team ".concat(j," successfully created")}),!o){n.next=15;break}return n.next=15,r(o.id);case 15:m([g]),y(""),z(!1),window.location.hash="#";case 19:case"end":return n.stop()}}),n)})));return function(){return n.apply(this,arguments)}}();return(0,t.jsxs)("div",{children:[(0,t.jsx)(l.ZP,{label:"Team Name",onChange:function(n){y(n.target.value)},value:j}),C&&C.name&&(0,t.jsx)(h.Z,{children:null===C||void 0===C?void 0:C.name}),(0,t.jsx)("br",{}),(0,t.jsx)("strong",{children:"Team Members"}),(0,t.jsx)(b.Z,{errors:C,members:p,setMembers:m,currentUser:e}),(0,t.jsxs)(w,{children:[(0,t.jsx)(f.zx,{variant:"secondary",onClick:function(){window.location.hash="#"},children:"Cancel"}),(0,t.jsx)(f.zx,{type:"button",onClick:E,children:k?(0,t.jsx)(v.Z,{type:"Grid",color:"#FFF",height:18,width:50,visible:k}):"Send Invitation"})]})]})}))},89779:function(n,r,e){"use strict";var t=e(85893),u=e(26265),a=e(59999),c=e(27261),s=(e(67294),e(11915)),i=e(35611),o=e(29163),l=e(17625),p=e(51436),f=e(10633);function d(n,r){var e=Object.keys(n);if(Object.getOwnPropertySymbols){var t=Object.getOwnPropertySymbols(n);r&&(t=t.filter((function(r){return Object.getOwnPropertyDescriptor(n,r).enumerable}))),e.push.apply(e,t)}return e}function v(n){for(var r=1;r<arguments.length;r++){var e=null!=arguments[r]?arguments[r]:{};r%2?d(Object(e),!0).forEach((function(r){(0,u.Z)(n,r,e[r])})):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(e)):d(Object(e)).forEach((function(r){Object.defineProperty(n,r,Object.getOwnPropertyDescriptor(e,r))}))}return n}function m(){var n=(0,c.Z)(["\n  align-self: center;\n  color: red;\n  cursor: pointer;\n"]);return m=function(){return n},n}function h(){var n=(0,c.Z)(["\n  grid-template-columns: 2fr 2fr 1fr;\n  align-items: start;\n  margin-bottom: 20px;\n"]);return h=function(){return n},n}function b(){var n=(0,c.Z)(["\n  max-height: 50vh;\n  overflow-y: scroll;\n"]);return b=function(){return n},n}function x(){var n=(0,c.Z)(["\n  margin: 10px 0;\n  cursor: pointer;\n  & span {\n    margin-left: 5px;\n  }\n"]);return x=function(){return n},n}function w(){var n=(0,c.Z)(["\n  border-bottom: 1px solid black;\n  margin: 10px 0;\n  grid-column: 1 / 3;\n"]);return w=function(){return n},n}function g(){var n=(0,c.Z)(["\n  & .pg-select-wrapper {\n    height: 44px;\n  }\n"]);return g=function(){return n},n}function j(){var n=(0,c.Z)(["\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  align-items: end;\n  margin-bottom: 10px;\n  grid-gap: 0 1em;\n"]);return j=function(){return n},n}var y=o.default.div(j()),Z=(0,o.default)(i.ZP)(g()),k=o.default.div(w()),z=o.default.span(x()),O=o.default.section(b()),C=(0,o.default)(y)(h()),P=(0,o.default)(l.G)(m());r.Z=function(n){var r=n.errors,e=n.members,u=n.setMembers,c=n.allowDelete,i=void 0===c||c,o=n.currentUser,d=void 0===o?null:o;return(0,t.jsxs)("div",{children:[(0,t.jsxs)("p",{children:["Enter your team member\u2019s email address and they will be sent an invitation to join the project. Once they accept the invitation, they will have access to your project. Their invitation will expire in"," ",(0,t.jsx)("strong",{children:"2 business days"}),"."]}),(0,t.jsxs)("p",{children:[(0,t.jsx)("span",{className:"strong",children:"Roles:"}),(0,t.jsx)("br",{}),(0,t.jsx)("span",{className:"underline",children:"Admin"}),": can manage integrations ",(0,t.jsx)("span",{className:"strong",children:"and"})," teams",(0,t.jsx)("br",{}),(0,t.jsx)("span",{className:"underline",children:"Members"}),": can ",(0,t.jsx)("span",{className:"strong",children:"only"})," manage integrations"]}),(0,t.jsxs)(O,{children:[(0,t.jsxs)(y,{children:[(0,t.jsx)("strong",{children:"Member"}),(0,t.jsx)("strong",{children:"Role"}),(0,t.jsx)(k,{})]}),d&&(0,t.jsxs)(C,{children:[(0,t.jsx)(s.ZP,{value:(null===d||void 0===d?void 0:d.email)||"",readOnly:!0}),(0,t.jsx)(Z,{label:"Role",disabled:!0,value:"admin",children:(0,t.jsx)("option",{value:"admin",children:"Admin"})})]}),e.map((function(n,c){return(0,t.jsx)(t.Fragment,{children:(0,t.jsxs)(C,{children:[(0,t.jsxs)("div",{children:[(0,t.jsx)(s.ZP,{placeholder:"Enter email address",onChange:function(n){return function(n,r){var t=v({},e[n]);t.idirEmail=r.target.value;var c=(0,a.Z)(e);c[n]=t,u(c)}(c,n)},value:n.idirEmail}),r&&r.members&&r.members[c]&&(0,t.jsx)(f.Z,{children:r.members[c]})]}),(0,t.jsxs)(Z,{label:"Role",onChange:function(n){return function(n,r){var t=v({},e[n]);t.role=r.target.value;var c=(0,a.Z)(e);c[n]=t,u(c)}(c,n)},value:n.role,children:[(0,t.jsx)("option",{value:"member",children:"Member"}),(0,t.jsx)("option",{value:"admin",children:"Admin"})]}),0!==c&&i&&(0,t.jsx)(P,{icon:p.uMC,onClick:function(){return n=c,void u(e.filter((function(r,e){return e!==n})));var n},title:"Delete"})]},n.id)})})),(0,t.jsxs)(z,{onClick:function(){u([].concat((0,a.Z)(e),[{idirEmail:"",role:"member",id:(new Date).getTime(),pending:!0}]))},children:[(0,t.jsx)(l.G,{style:{color:"#006fc4"},icon:p.KtF,title:"Add Item"}),(0,t.jsx)("span",{children:"Add another team member"})]})]})]})}},6645:function(n,r,e){"use strict";e.d(r,{hG:function(){return o},A_:function(){return l},XJ:function(){return p},H0:function(){return f},zD:function(){return d},WN:function(){return v},Jl:function(){return m},Uw:function(){return h}});var t=e(809),u=e.n(t),a=e(92447),c=e(70513),s=e(96486),i=e(6434),o=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.post("requests",r).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[(0,i.UB)(e),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}(),l=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.post("request",{requestId:(0,s.isString)(r)?parseInt(r):r}).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[(0,i.UB)(e),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}(),p=function(){var n=(0,a.Z)(u().mark((function n(){var r,e,t,a=arguments;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return r=a.length>0&&void 0!==a[0]?a[0]:"active",e={params:{include:r}},n.prev=2,n.next=5,c.e.get("requests",e).then((function(n){return n.data}));case 5:return t=n.sent,t=(0,s.orderBy)(t,["createdAt"],["desc"]),n.abrupt("return",[t.map(i.UB),null]);case 10:return n.prev=10,n.t0=n.catch(2),n.abrupt("return",(0,c.z)(n.t0));case 13:case"end":return n.stop()}}),n,null,[[2,10]])})));return function(){return n.apply(this,arguments)}}(),f=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.get("team-integrations/".concat(r)).then((function(n){return n.data}));case 3:return e=n.sent,e=(0,s.orderBy)(e,["createdAt"],["desc"]),n.abrupt("return",[e.map(i.UB),null]);case 8:return n.prev=8,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 11:case"end":return n.stop()}}),n,null,[[0,8]])})));return function(r){return n.apply(this,arguments)}}(),d=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.post("requests-all",r).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[{count:e.count,rows:e.rows.map(i.UB)},null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}(),v=function(){var n=(0,a.Z)(u().mark((function n(r){var e,t,a,s=arguments;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return e=s.length>1&&void 0!==s[1]&&s[1],n.prev=1,t="requests",e&&(t="".concat(t,"?submit=true")),n.next=6,c.e.put(t,r).then((function(n){return n.data}));case 6:return a=n.sent,n.abrupt("return",[(0,i.UB)(a),null]);case 10:return n.prev=10,n.t0=n.catch(1),n.abrupt("return",(0,c.z)(n.t0));case 13:case"end":return n.stop()}}),n,null,[[1,10]])})));return function(r){return n.apply(this,arguments)}}(),m=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.delete("requests",{params:{id:r}}).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[e,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}(),h=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.put("request-metadata",r).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[(0,i.UB)(e),null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}()},38073:function(n,r,e){"use strict";e.d(r,{Dc:function(){return s},l8:function(){return i},Cm:function(){return o},w2:function(){return l},yG:function(){return p},YY:function(){return f},zZ:function(){return d},MH:function(){return v},rU:function(){return m},fC:function(){return h}});var t=e(809),u=e.n(t),a=e(92447),c=e(70513),s=function(){var n=(0,a.Z)(u().mark((function n(){var r;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.get("teams").then((function(n){return n.data}));case 3:return r=n.sent,n.abrupt("return",[r,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(){return n.apply(this,arguments)}}(),i=function(){var n=(0,a.Z)(u().mark((function n(){var r;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.get("allowed-teams").then((function(n){return n.data}));case 3:return r=n.sent,n.abrupt("return",[r,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(){return n.apply(this,arguments)}}(),o=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.post("teams",r).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[e,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}(),l=function(){var n=(0,a.Z)(u().mark((function n(r){var e,t,a,s;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,e=r.name,t=r.id,a={name:e},n.next=5,c.e.put("teams/".concat(t),a).then((function(n){return n.data}));case 5:return s=n.sent,n.abrupt("return",[s,null]);case 9:return n.prev=9,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 12:case"end":return n.stop()}}),n,null,[[0,9]])})));return function(r){return n.apply(this,arguments)}}(),p=function(){var n=(0,a.Z)(u().mark((function n(r){var e,t,a;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,e=r.id,t=r.members,n.next=4,c.e.post("teams/".concat(e,"/members"),t).then((function(n){return n.data}));case 4:return a=n.sent,n.abrupt("return",[a,null]);case 8:return n.prev=8,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 11:case"end":return n.stop()}}),n,null,[[0,8]])})));return function(r){return n.apply(this,arguments)}}(),f=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.get("teams/".concat(r,"/members")).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[e,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}(),d=function(){var n=(0,a.Z)(u().mark((function n(r,e,t){var a;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.put("teams/".concat(r,"/members/").concat(e),t).then((function(n){return n.data}));case 3:return a=n.sent,n.abrupt("return",[a,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r,e,t){return n.apply(this,arguments)}}(),v=function(){var n=(0,a.Z)(u().mark((function n(r,e){var t;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.delete("teams/".concat(e,"/members/").concat(r)).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[t,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r,e){return n.apply(this,arguments)}}(),m=function(){var n=(0,a.Z)(u().mark((function n(r,e){var t;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.post("teams/".concat(e,"/invite"),r).then((function(n){return n.data}));case 3:return t=n.sent,n.abrupt("return",[t,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r,e){return n.apply(this,arguments)}}(),h=function(){var n=(0,a.Z)(u().mark((function n(r){var e;return u().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.prev=0,n.next=3,c.e.delete("teams/".concat(r)).then((function(n){return n.data}));case 3:return e=n.sent,n.abrupt("return",[e,null]);case 7:return n.prev=7,n.t0=n.catch(0),n.abrupt("return",(0,c.z)(n.t0));case 10:case"end":return n.stop()}}),n,null,[[0,7]])})));return function(r){return n.apply(this,arguments)}}()}}]);