"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[926],{76691:function(e,n,t){t.d(n,{Kk:function(){return k},MO:function(){return O},ZP:function(){return F},c4:function(){return P}});var r,i,o,s=t(50029),a=t(59499),c=t(4730),l=t(71383),u=t(87794),d=t.n(u),p=t(11163),f=t(85444),h=t(99603),x=t(59417),m=t(61165),b=t(37226),v=t(63055),g=t(34798),j=t.n(g),w=t(20353),y=t(85893),Z=["disabled","activeColor","isUnread"];function C(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable})),t.push.apply(t,r)}return t}var P=f.default.div(r||(r=(0,l.Z)(["\n  height: 100%;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  padding-right: 15px;\n  & > * {\n    margin-left: 15px;\n  }\n"]))),k=(0,f.default)(function(e){e.disabled,e.activeColor,e.isUnread;var n=(0,c.Z)(e,Z);return(0,y.jsx)(h.G,function(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?C(Object(t),!0).forEach(function(n){(0,a.Z)(e,n,t[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):C(Object(t)).forEach(function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))})}return e}({},n))})(i||(i=(0,l.Z)(["\n  cursor: ",";\n  ","\n  ",";\n"])),function(e){return e.disabled?"not-allowed":"pointer"},function(e){return e.disabled?"color: #CACACA;":"color: inherit; &:hover { color: ".concat(e.activeColor||"#000","; }")},function(e){return e.isUnread?"color: ".concat(v.Uo):""}),O=f.default.div(o||(o=(0,l.Z)(["\n  height: 40px;\n  border-right: 2px solid #e3e3e3;\n"])));function F(e){var n,t,r=e.request,i=e.onDelete,o=e.defaultActiveColor,a=e.children,c=e.editIconStyle,l=e.delIconStyle,u=(0,p.useRouter)();(r||{}).archived;var f=(0,w.$8)(r),h=(0,w.uP)(r),g="delete-modal-".concat(null==r?void 0:r.id),Z=(n=(0,s.Z)(d().mark(function e(n){return d().wrap(function(e){for(;;)switch(e.prev=e.next){case 0:if(n.stopPropagation(),h){e.next=3;break}return e.abrupt("return");case 3:return e.next=5,u.push("/request/".concat(r.id,"?status=").concat(r.status));case 5:case"end":return e.stop()}},e)})),function(e){return n.apply(this,arguments)}),C=(t=(0,s.Z)(d().mark(function e(){return d().wrap(function(e){for(;;)switch(e.prev=e.next){case 0:if(!["pr","planned","submitted"].includes((null==r?void 0:r.status)||"")){e.next=3;break}return e.abrupt("return");case 3:return e.next=5,(0,b.Jl)(r.id);case 5:window.location.hash="#",i&&i(r);case 7:case"end":return e.stop()}},e)})),function(){return t.apply(this,arguments)});return(0,y.jsxs)(y.Fragment,{children:[(0,y.jsxs)(P,{children:[a,(0,y.jsx)(k,{disabled:!h,icon:x.Xcf,role:"button","aria-label":"edit",onClick:Z,activeColor:o,title:"Edit",size:"lg",style:void 0===c?{}:c}),(0,y.jsx)(k,{icon:x.$aW,role:"button","data-testid":"action-button-delete","aria-label":"delete",onClick:f?function(){r.id&&f&&(window.location.hash=g)}:j(),disabled:!f,activeColor:v.Uo,title:"Delete",size:"lg",style:void 0===l?{}:l})]}),(0,y.jsx)(m.Z,{id:g,content:"You are about to delete this integration request. This action cannot be undone.",onConfirm:C,title:"Confirm Deletion",confirmText:"Delete"})]})}},44e3:function(e,n,t){t.d(n,{$:function(){return f},B:function(){return h}});var r,i,o=t(71383);t(67294);var s=t(85444),a=t(99603),c=t(59417),l=t(63055),u=t(85893),d=(0,s.default)(a.G)(r||(r=(0,o.Z)(["\n  margin-right: 10px;\n"]))),p=s.default.div(i||(i=(0,o.Z)(["\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n"])));function f(e){var n=e.children;return(0,u.jsxs)(p,{children:[(0,u.jsx)(d,{icon:c.sqG,color:l.UH,size:"2x"}),(0,u.jsx)("span",{children:(0,u.jsx)("em",{children:n})})]})}function h(e){var n=e.children;return(0,u.jsxs)(p,{children:[(0,u.jsx)(d,{icon:c.eHv,color:l.Uo,size:"2x"}),(0,u.jsx)("span",{children:(0,u.jsx)("em",{children:n})})]})}},39550:function(e,n,t){var r,i=t(71383),o=t(85444);n.Z=o.default.ul(r||(r=(0,i.Z)(["\n  list-style-type: none;\n  margin: 0;\n  position: relative;\n\n  & li {\n    border-bottom: 1px solid #d4d4d4;\n    & svg.svg-inline--fa {\n      position: absolute;\n      right: 0;\n    }\n\n    & div.icon {\n      position: absolute;\n      right: 0;\n      bottom: 5px;\n    }\n  }\n"])))},12059:function(e,n,t){t.d(n,{s:function(){return Y},Z:function(){return K}});var r,i,o,s,a,c,l=t(16835),u=t(50029),d=t(71383),p=t(87794),f=t.n(p),h=t(67294),x=t(42050),m=t(85444),b=t(63055),v=m.default.h3(r||(r=(0,d.Z)(["\n  color: #777777;\n  font-size: ",";\n  font-weight: bold;\n  min-height: 30px;\n  border-bottom: 1px solid #707070;\n  margin-bottom: 5px;\n  overflow: wrap;\n"])),b.CA),g=t(99603),j=t(59417),w=t(74150),y=t(85330),Z=m.default.p(i||(i=(0,d.Z)(["\n  font-size: ",";\n  color: "," !important;\n"])),b.KN,b.we),C=t(11752),P=t.n(C),k=t(39550),O=t(44e3),F=t(15812),B=t(37226),G=t(85893),T=(P()()||{}).publicRuntimeConfig,q=(void 0===T?{}:T).app_env,S=(0,m.default)(v)(o||(o=(0,d.Z)(["\n  border-bottom: none;\n  margin-top: 10px;\n"]))),R=(0,m.default)(S)(s||(s=(0,d.Z)(["\n  font-size: 14px;\n"]))),A=m.default.a(a||(a=(0,d.Z)(["\n  color: ",";\n"])),b.nc),z=(0,m.default)(x.Z)(c||(c=(0,d.Z)(["\n  margin-bottom: 10px;\n"]))),D=function(e){switch(e){case"submitted":return 0;case"pr":return 33;case"planned":return 66;default:return 100}},U=function(e){switch(e){case"submitted":return"Process request submitted...";case"pr":return"Pull request created...";case"planned":return"Terraform plan succeeded...";case"prFailed":case"planFailed":case"applyFailed":return"An error has occurred";default:return""}},E=function(e){switch(e){case"prFailed":case"planFailed":case"applyFailed":return!0;default:return!1}},L=function(e){switch(e){case"submitted":default:return 0;case"pr":return 1;case"prFailed":return 2;case"planned":return 3;case"planFailed":return 4;case"applied":return 5;case"applyFailed":return 6}};function Y(e){var n=e.integration,t=n.status,r=n.updatedAt,i=E(t),o=new Date(r||"").toLocaleString();return(0,G.jsxs)(G.Fragment,{children:[(0,G.jsx)(z,{now:D(t),animated:!0,variant:i?"danger":void 0}),(0,G.jsxs)(Z,{children:["Last updated at ",o]})]})}var K=(0,F.hU)(function(e){var n=e.integration,t=e.title,r=e.alert,i=n.id,o=n.status,s=n.updatedAt,a=n.prNumber,c=(0,h.useState)(!1),d=c[0],p=c[1],x=E(o),m=U(o),b=new Date(s||"");(0,h.useEffect)(function(){p(12e5<new Date().getTime()-b.getTime())},[n]);var v=[(0,G.jsxs)("li",{children:["Process request submitted",(0,G.jsx)(g.G,{icon:j.f8k,color:"#00C45B"})]},"1")],Z=L(o);Z<1?v.push((0,G.jsxs)("li",{children:["Pull request created",(0,G.jsx)(g.G,{icon:j.LM3,color:"#B2B2B2",spin:!0})]},"2")):2===Z?v.push((0,G.jsxs)("li",{children:["Pull request creation failed",(0,G.jsx)(g.G,{icon:j.nYk,color:"#FF0000"})]},"2")):v.push((0,G.jsxs)("li",{children:["Pull request created (",(0,G.jsx)(w.default,{external:!0,href:"production"===q?"https://github.com/bcgov/sso-terraform/pull/".concat(a):"https://github.com/bcgov/sso-terraform-dev/pull/".concat(a),children:"link"}),")",(0,G.jsx)(g.G,{icon:j.f8k,color:"#00C45B"})]},"2")),Z<3?v.push((0,G.jsxs)("li",{children:["Terraform plan succeeded",(0,G.jsx)(g.G,{icon:j.LM3,color:"#B2B2B2",spin:!0})]},"3")):4===Z?v.push((0,G.jsxs)("li",{children:["Terraform plan failed",(0,G.jsx)(g.G,{icon:j.nYk,color:"#FF0000"})]},"3")):v.push((0,G.jsxs)("li",{children:["Terraform plan succeeded",(0,G.jsx)(g.G,{icon:j.f8k,color:"#00C45B"})]},"3")),Z<5?v.push((0,G.jsxs)("li",{children:["Request processed",(0,G.jsx)(g.G,{icon:j.LM3,color:"#B2B2B2",spin:!0})]},"4")):6===Z?v.push((0,G.jsxs)("li",{children:["Request failed",(0,G.jsx)(g.G,{icon:j.nYk,color:"#FF0000"})]},"4")):v.push((0,G.jsxs)("li",{children:["Request processed",(0,G.jsx)(g.G,{icon:j.f8k,color:"#00C45B"})]},"4"));var C=null;return x?C=(0,G.jsxs)(O.B,{children:["You have an unexpected error. Please contact our SSO support team by"," ",(0,G.jsx)(A,{href:"https://chat.developer.gov.bc.ca/channel/sso",target:"_blank",title:"Rocket Chat",children:"Rocket.Chat"})," ","or"," ",(0,G.jsx)(A,{href:"mailto:bcgov.sso@gov.bc.ca",title:"Pathfinder SSO",target:"blank",children:"Email us"})," "]}):d&&(C=(0,G.jsxs)(O.$,{children:[(0,G.jsx)("div",{children:"Your integration submission is taking longer than expected, please select resubmit."}),(0,G.jsx)(y.zx,{variant:"bcPrimary",size:"small",type:"button",onClick:(0,u.Z)(f().mark(function e(){var n,t,o,s,a;return f().wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,(0,B.ct)(i);case 2:n=e.sent,(t=(0,l.Z)(n,2))[0],s=(o=t[1])?"danger":"success",a=o?"failed to resubmit the request":"resubmitted the request successfully",r.show({variant:s,fadeOut:1e4,closable:!0,content:a}),p(!1);case 10:case"end":return e.stop()}},e)})),children:"Resubmit"})]})),(0,G.jsxs)(G.Fragment,{children:[t&&(0,G.jsx)(S,{children:t}),(0,G.jsx)(R,{children:m}),(0,G.jsx)(Y,{integration:n}),(0,G.jsx)(k.Z,{children:v}),C]})})},20353:function(e,n,t){t.d(n,{$8:function(){return r},VV:function(){return s},Yr:function(){return a},te:function(){return o},uP:function(){return i}});var r=function(e){return!(!e||e.apiServiceAccount||e.archived||["pr","planned","submitted"].includes((null==e?void 0:e.status)||""))&&(!e.usesTeam||"admin"===e.userTeamRole)},i=function(e){return!!e&&!e.apiServiceAccount&&!e.archived&&!!["draft","applied"].includes(e.status||"")},o=function(e){return!(!e||Number(e.integrationCount)>0)&&"admin"===e.role},s=function(e){return!!e&&"admin"===e.role},a=function(e){return!(!e||e.apiServiceAccount||e.archived||["pr","planned","submitted"].includes((null==e?void 0:e.status)||""))&&(!e.usesTeam||"admin"===e.userTeamRole)}},49910:function(e,n,t){t.d(n,{F:function(){return h}});var r,i,o=t(71383),s=t(67294),a=t(11163),c=t(64735),l=t(85444),u=t(85330),d=t(59912),p=t(92704),f=t(85893),h=[{maxWidth:900,marginTop:0,marginLeft:10,marginRight:10,marginUnit:"px",horizontalAlign:"none"},{width:480,marginTop:0,marginLeft:2.5,marginRight:2.5,marginUnit:"rem",horizontalAlign:"none"}],x=l.default.div(r||(r=(0,o.Z)(["\n  overflow: auto;\n"]))),m=l.default.div(i||(i=(0,o.Z)(["\n  padding-top: 2px;\n"])));n.Z=function(e){var n,t=e.tab,r=e.leftPanel,i=e.rightPanel,o=e.children,l=(0,a.useRouter)(),b=(0,s.useContext)(p.SessionContext)||{},v=b.user,g=b.enableGold,j=null==v?void 0:null===(n=v.integrations)||void 0===n?void 0:n.find(function(e){return"silver"===e.serviceType}),w=(0,f.jsxs)(u.mQ,{onChange:function(e){l.replace("/my-dashboard/".concat(e))},activeKey:t,tabBarGutter:30,children:[(0,f.jsx)(u.OK,{tab:"My Projects"},"integrations"),(0,f.jsx)(u.OK,{tab:"My Teams"},"teams"),g&&j&&(0,f.jsx)(u.OK,{tab:"*New - Silver to Gold Upgrade"},"s2g")]});return(0,f.jsx)(d.Z,{rules:h,children:o?(0,f.jsxs)(m,{children:[w,o]}):(0,f.jsx)(c.ZP,{cols:10,children:(0,f.jsxs)(c.ZP.Row,{collapse:"1100",gutter:[15,2],children:[(0,f.jsx)(c.ZP.Col,{span:6,children:(0,f.jsxs)(x,{children:[w,r&&r()]})}),(0,f.jsx)(c.ZP.Col,{span:4,children:i&&i()})]})})})}}}]);