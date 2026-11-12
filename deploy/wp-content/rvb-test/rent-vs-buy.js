"use strict";(()=>{var X=globalThis,ee=X.ShadowRoot&&(X.ShadyCSS===void 0||X.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,he=Symbol(),Ee=new WeakMap,L=class{constructor(e,n,r){if(this._$cssResult$=!0,r!==he)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=n}get styleSheet(){let e=this.o,n=this.t;if(ee&&e===void 0){let r=n!==void 0&&n.length===1;r&&(e=Ee.get(n)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&Ee.set(n,e))}return e}toString(){return this.cssText}},Ce=t=>new L(typeof t=="string"?t:t+"",void 0,he),ue=(t,...e)=>{let n=t.length===1?t[0]:e.reduce((r,s,i)=>r+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new L(n,t,he)},Te=(t,e)=>{if(ee)t.adoptedStyleSheets=e.map(n=>n instanceof CSSStyleSheet?n:n.styleSheet);else for(let n of e){let r=document.createElement("style"),s=X.litNonce;s!==void 0&&r.setAttribute("nonce",s),r.textContent=n.cssText,t.appendChild(r)}},me=ee?t=>t:t=>t instanceof CSSStyleSheet?(e=>{let n="";for(let r of e.cssRules)n+=r.cssText;return Ce(n)})(t):t;var{is:ut,defineProperty:mt,getOwnPropertyDescriptor:ft,getOwnPropertyNames:gt,getOwnPropertySymbols:$t,getPrototypeOf:yt}=Object,E=globalThis,Re=E.trustedTypes,bt=Re?Re.emptyScript:"",vt=E.reactiveElementPolyfillSupport,I=(t,e)=>t,fe={toAttribute(t,e){switch(e){case Boolean:t=t?bt:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,e){let n=t;switch(e){case Boolean:n=t!==null;break;case Number:n=t===null?null:Number(t);break;case Object:case Array:try{n=JSON.parse(t)}catch{n=null}}return n}},Me=(t,e)=>!ut(t,e),ke={attribute:!0,type:String,converter:fe,reflect:!1,useDefault:!1,hasChanged:Me};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),E.litPropertyMetadata??(E.litPropertyMetadata=new WeakMap);var x=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,n=ke){if(n.state&&(n.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((n=Object.create(n)).wrapped=!0),this.elementProperties.set(e,n),!n.noAccessor){let r=Symbol(),s=this.getPropertyDescriptor(e,r,n);s!==void 0&&mt(this.prototype,e,s)}}static getPropertyDescriptor(e,n,r){let{get:s,set:i}=ft(this.prototype,e)??{get(){return this[n]},set(o){this[n]=o}};return{get:s,set(o){let l=s?.call(this);i?.call(this,o),this.requestUpdate(e,l,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??ke}static _$Ei(){if(this.hasOwnProperty(I("elementProperties")))return;let e=yt(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(I("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(I("properties"))){let n=this.properties,r=[...gt(n),...$t(n)];for(let s of r)this.createProperty(s,n[s])}let e=this[Symbol.metadata];if(e!==null){let n=litPropertyMetadata.get(e);if(n!==void 0)for(let[r,s]of n)this.elementProperties.set(r,s)}this._$Eh=new Map;for(let[n,r]of this.elementProperties){let s=this._$Eu(n,r);s!==void 0&&this._$Eh.set(s,n)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let n=[];if(Array.isArray(e)){let r=new Set(e.flat(1/0).reverse());for(let s of r)n.unshift(me(s))}else e!==void 0&&n.push(me(e));return n}static _$Eu(e,n){let r=n.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,n=this.constructor.elementProperties;for(let r of n.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Te(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,n,r){this._$AK(e,r)}_$ET(e,n){let r=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,r);if(s!==void 0&&r.reflect===!0){let i=(r.converter?.toAttribute!==void 0?r.converter:fe).toAttribute(n,r.type);this._$Em=e,i==null?this.removeAttribute(s):this.setAttribute(s,i),this._$Em=null}}_$AK(e,n){let r=this.constructor,s=r._$Eh.get(e);if(s!==void 0&&this._$Em!==s){let i=r.getPropertyOptions(s),o=typeof i.converter=="function"?{fromAttribute:i.converter}:i.converter?.fromAttribute!==void 0?i.converter:fe;this._$Em=s;let l=o.fromAttribute(n,i.type);this[s]=l??this._$Ej?.get(s)??l,this._$Em=null}}requestUpdate(e,n,r,s=!1,i){if(e!==void 0){let o=this.constructor;if(s===!1&&(i=this[e]),r??(r=o.getPropertyOptions(e)),!((r.hasChanged??Me)(i,n)||r.useDefault&&r.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,r))))return;this.C(e,n,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,n,{useDefault:r,reflect:s,wrapped:i},o){r&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,o??n??this[e]),i!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(n=void 0),this._$AL.set(e,n)),s===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(n){Promise.reject(n)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(let[s,i]of this._$Ep)this[s]=i;this._$Ep=void 0}let r=this.constructor.elementProperties;if(r.size>0)for(let[s,i]of r){let{wrapped:o}=i,l=this[s];o!==!0||this._$AL.has(s)||l===void 0||this.C(s,void 0,i,l)}}let e=!1,n=this._$AL;try{e=this.shouldUpdate(n),e?(this.willUpdate(n),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(n)):this._$EM()}catch(r){throw e=!1,this._$EM(),r}e&&this._$AE(n)}willUpdate(e){}_$AE(e){this._$EO?.forEach(n=>n.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(n=>this._$ET(n,this[n]))),this._$EM()}updated(e){}firstUpdated(e){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[I("elementProperties")]=new Map,x[I("finalized")]=new Map,vt?.({ReactiveElement:x}),(E.reactiveElementVersions??(E.reactiveElementVersions=[])).push("2.1.2");var Y=globalThis,Ne=t=>t,te=Y.trustedTypes,Ue=te?te.createPolicy("lit-html",{createHTML:t=>t}):void 0,$e="$lit$",S=`lit$${Math.random().toFixed(9).slice(2)}$`,ye="?"+S,At=`<${ye}>`,N=document,V=()=>N.createComment(""),W=t=>t===null||typeof t!="object"&&typeof t!="function",be=Array.isArray,Fe=t=>be(t)||typeof t?.[Symbol.iterator]=="function",ge=`[ 	
\f\r]`,q=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,He=/-->/g,ze=/>/g,k=RegExp(`>|${ge}(?:([^\\s"'>=/]+)(${ge}*=${ge}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),De=/'/g,Oe=/"/g,Be=/^(?:script|style|textarea|title)$/i,ve=t=>(e,...n)=>({_$litType$:t,strings:e,values:n}),$=ve(1),Ft=ve(2),Bt=ve(3),b=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),je=new WeakMap,M=N.createTreeWalker(N,129);function Le(t,e){if(!be(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ue!==void 0?Ue.createHTML(e):e}var Ie=(t,e)=>{let n=t.length-1,r=[],s,i=e===2?"<svg>":e===3?"<math>":"",o=q;for(let l=0;l<n;l++){let a=t[l],d,h,c=-1,f=0;for(;f<a.length&&(o.lastIndex=f,h=o.exec(a),h!==null);)f=o.lastIndex,o===q?h[1]==="!--"?o=He:h[1]!==void 0?o=ze:h[2]!==void 0?(Be.test(h[2])&&(s=RegExp("</"+h[2],"g")),o=k):h[3]!==void 0&&(o=k):o===k?h[0]===">"?(o=s??q,c=-1):h[1]===void 0?c=-2:(c=o.lastIndex-h[2].length,d=h[1],o=h[3]===void 0?k:h[3]==='"'?Oe:De):o===Oe||o===De?o=k:o===He||o===ze?o=q:(o=k,s=void 0);let g=o===k&&t[l+1].startsWith("/>")?" ":"";i+=o===q?a+At:c>=0?(r.push(d),a.slice(0,c)+$e+a.slice(c)+S+g):a+S+(c===-2?l:g)}return[Le(t,i+(t[n]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]},J=class t{constructor({strings:e,_$litType$:n},r){let s;this.parts=[];let i=0,o=0,l=e.length-1,a=this.parts,[d,h]=Ie(e,n);if(this.el=t.createElement(d,r),M.currentNode=this.el.content,n===2||n===3){let c=this.el.content.firstChild;c.replaceWith(...c.childNodes)}for(;(s=M.nextNode())!==null&&a.length<l;){if(s.nodeType===1){if(s.hasAttributes())for(let c of s.getAttributeNames())if(c.endsWith($e)){let f=h[o++],g=s.getAttribute(c).split(S),v=/([.?@])?(.*)/.exec(f);a.push({type:1,index:i,name:v[2],strings:g,ctor:v[1]==="."?re:v[1]==="?"?se:v[1]==="@"?ie:H}),s.removeAttribute(c)}else c.startsWith(S)&&(a.push({type:6,index:i}),s.removeAttribute(c));if(Be.test(s.tagName)){let c=s.textContent.split(S),f=c.length-1;if(f>0){s.textContent=te?te.emptyScript:"";for(let g=0;g<f;g++)s.append(c[g],V()),M.nextNode(),a.push({type:2,index:++i});s.append(c[f],V())}}}else if(s.nodeType===8)if(s.data===ye)a.push({type:2,index:i});else{let c=-1;for(;(c=s.data.indexOf(S,c+1))!==-1;)a.push({type:7,index:i}),c+=S.length-1}i++}}static createElement(e,n){let r=N.createElement("template");return r.innerHTML=e,r}};function U(t,e,n=t,r){if(e===b)return e;let s=r!==void 0?n._$Co?.[r]:n._$Cl,i=W(e)?void 0:e._$litDirective$;return s?.constructor!==i&&(s?._$AO?.(!1),i===void 0?s=void 0:(s=new i(t),s._$AT(t,n,r)),r!==void 0?(n._$Co??(n._$Co=[]))[r]=s:n._$Cl=s),s!==void 0&&(e=U(t,s._$AS(t,e.values),s,r)),e}var ne=class{constructor(e,n){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=n}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:n},parts:r}=this._$AD,s=(e?.creationScope??N).importNode(n,!0);M.currentNode=s;let i=M.nextNode(),o=0,l=0,a=r[0];for(;a!==void 0;){if(o===a.index){let d;a.type===2?d=new O(i,i.nextSibling,this,e):a.type===1?d=new a.ctor(i,a.name,a.strings,this,e):a.type===6&&(d=new oe(i,this,e)),this._$AV.push(d),a=r[++l]}o!==a?.index&&(i=M.nextNode(),o++)}return M.currentNode=N,s}p(e){let n=0;for(let r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,n),n+=r.strings.length-2):r._$AI(e[n])),n++}},O=class t{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,n,r,s){this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=e,this._$AB=n,this._$AM=r,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,n=this._$AM;return n!==void 0&&e?.nodeType===11&&(e=n.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,n=this){e=U(this,e,n),W(e)?e===p||e==null||e===""?(this._$AH!==p&&this._$AR(),this._$AH=p):e!==this._$AH&&e!==b&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Fe(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==p&&W(this._$AH)?this._$AA.nextSibling.data=e:this.T(N.createTextNode(e)),this._$AH=e}$(e){let{values:n,_$litType$:r}=e,s=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=J.createElement(Le(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===s)this._$AH.p(n);else{let i=new ne(s,this),o=i.u(this.options);i.p(n),this.T(o),this._$AH=i}}_$AC(e){let n=je.get(e.strings);return n===void 0&&je.set(e.strings,n=new J(e)),n}k(e){be(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,s=0;for(let i of e)s===n.length?n.push(r=new t(this.O(V()),this.O(V()),this,this.options)):r=n[s],r._$AI(i),s++;s<n.length&&(this._$AR(r&&r._$AB.nextSibling,s),n.length=s)}_$AR(e=this._$AA.nextSibling,n){for(this._$AP?.(!1,!0,n);e!==this._$AB;){let r=Ne(e).nextSibling;Ne(e).remove(),e=r}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},H=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,n,r,s,i){this.type=1,this._$AH=p,this._$AN=void 0,this.element=e,this.name=n,this._$AM=s,this.options=i,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=p}_$AI(e,n=this,r,s){let i=this.strings,o=!1;if(i===void 0)e=U(this,e,n,0),o=!W(e)||e!==this._$AH&&e!==b,o&&(this._$AH=e);else{let l=e,a,d;for(e=i[0],a=0;a<i.length-1;a++)d=U(this,l[r+a],n,a),d===b&&(d=this._$AH[a]),o||(o=!W(d)||d!==this._$AH[a]),d===p?e=p:e!==p&&(e+=(d??"")+i[a+1]),this._$AH[a]=d}o&&!s&&this.j(e)}j(e){e===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},re=class extends H{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===p?void 0:e}},se=class extends H{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==p)}},ie=class extends H{constructor(e,n,r,s,i){super(e,n,r,s,i),this.type=5}_$AI(e,n=this){if((e=U(this,e,n,0)??p)===b)return;let r=this._$AH,s=e===p&&r!==p||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,i=e!==p&&(r===p||s);s&&this.element.removeEventListener(this.name,this,r),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},oe=class{constructor(e,n,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=n,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){U(this,e)}},qe={M:$e,P:S,A:ye,C:1,L:Ie,R:ne,D:Fe,V:U,I:O,H,N:se,U:ie,B:re,F:oe},_t=Y.litHtmlPolyfillSupport;_t?.(J,O),(Y.litHtmlVersions??(Y.litHtmlVersions=[])).push("3.3.3");var Ye=(t,e,n)=>{let r=n?.renderBefore??e,s=r._$litPart$;if(s===void 0){let i=n?.renderBefore??null;r._$litPart$=s=new O(e.insertBefore(V(),i),i,void 0,n??{})}return s._$AI(t),s};var K=globalThis,C=class extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var n;let e=super.createRenderRoot();return(n=this.renderOptions).renderBefore??(n.renderBefore=e.firstChild),e}update(e){let n=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Ye(n,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return b}};C._$litElement$=!0,C.finalized=!0,K.litElementHydrateSupport?.({LitElement:C});var xt=K.litElementPolyfillSupport;xt?.({LitElement:C});(K.litElementVersions??(K.litElementVersions=[])).push("4.2.2");var z={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},Ve=t=>(...e)=>({_$litDirective$:t,values:e}),ae=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,n,r){this._$Ct=e,this._$AM=n,this._$Ci=r}_$AS(e,n){return this.update(e,n)}update(e,n){return this.render(...n)}};var{I:nn}=qe;var We=t=>t.strings===void 0;var St={},Je=(t,e=St)=>t._$AH=e;var Ae=Ve(class extends ae{constructor(t){if(super(t),t.type!==z.PROPERTY&&t.type!==z.ATTRIBUTE&&t.type!==z.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!We(t))throw Error("`live` bindings can only contain a single expression")}render(t){return t}update(t,[e]){if(e===b||e===p)return e;let n=t.element,r=t.name;if(t.type===z.PROPERTY){if(e===n[r])return b}else if(t.type===z.BOOLEAN_ATTRIBUTE){if(!!e===n.hasAttribute(r))return b}else if(t.type===z.ATTRIBUTE&&n.getAttribute(r)===e+"")return b;return Je(t),e}});var Pt=["vatPct","valuationFee","titleDeedFee","knowledgeFee","innovationFee","adminMortgageFee","processingFeePct","propertyInsurancePct","lifeInsurancePct"];var Ke=t=>Number.isFinite(t)&&t>0,le=t=>Number.isFinite(t)&&t>=0;function Ge({price:t,monthlyRent:e,downPaymentPct:n,ratePct:r,termYears:s,fees:i={}}){if(!(Ke(t)&&le(e)&&le(n)&&n<100&&le(r)&&Ke(s)&&Object.values(i).every(le)))return null;let l=t*(n/100),a=t-l,d=s*12,h=r/100/12,c=h===0?a/d:a*h/(1-(1+h)**-d),f=t*(i.propertyInsurancePct??0)/100/12+t*(i.lifeInsurancePct??0)/100,g=c+f,v=(t<5e5?2e3:4e3)*(1+(i.vatPct??5)/100),A=t*.04+t*.02+a*.0025+(i.adminMortgageFee??0)+a*(i.processingFeePct??0)/100+v+(i.valuationFee??0)+(i.titleDeedFee??0)+(i.knowledgeFee??0)+(i.innovationFee??0);return{monthlyRent:e,monthlyPayment:g,downPayment:l,purchaseFees:A,cashAtStart:l+A,feesComplete:Pt.every(_=>i[_]!==void 0)}}var wt={downPaymentPct:20,ratePct:3.99,termYears:25},Et=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],w=t=>typeof t=="number"&&Number.isFinite(t)&&t>=0,y=t=>w(t)&&t>0,nt=t=>w(t)&&t<=99,rt=t=>Number.isInteger(t)&&y(t)&&t<=25,xe=t=>Number.isInteger(t)&&y(t),de=t=>typeof t=="string"&&t.length<=100&&t.trim()!=="",T=t=>typeof t=="object"&&t!==null&&!Array.isArray(t),Qe=t=>new Set(t).size===t.length,st=t=>{if(typeof t!="string"||!/^\d{4}-\d{2}-\d{2}$/.test(t))return!1;let[e,n,r]=t.split("-").map(Number);return new Date(Date.UTC(e,n-1,r)).toISOString().slice(0,10)===t},Ze=t=>typeof t=="string"&&st(`${t}-01`),Ct=t=>T(t)&&de(t.id)&&y(t.from)&&y(t.to)&&t.from<t.to,it=t=>T(t)&&y(t.salePerSqm)&&y(t.saleSizeSqm)&&xe(t.sales)&&y(t.rentPerSqmYear)&&y(t.rentSizeSqm)&&xe(t.rents),Tt=t=>Array.isArray(t)&&t.length===3&&y(t[0])&&y(t[1])&&xe(t[2]),Xe=(t,e)=>Array.isArray(t)&&t.length<=e&&t.every(Tt)&&t.every((n,r)=>r===0||t[r-1][0]<n[0]),Rt=(t,e)=>T(t)&&de(t.name)&&Xe(t.sales,e)&&Xe(t.rents,e)&&t.sales.length+t.rents.length>0,kt=(t,e)=>T(t)&&de(t.name)&&de(t.rentArea)&&T(t.bands)&&Object.entries(t.bands).every(([n,r])=>e.includes(n)&&it(r))&&(t.projects===void 0||Array.isArray(t.projects)&&t.projects.length<=1e3&&t.projects.every(n=>Rt(n,e.length)));function ot(t){if(!T(t))return null;let{asOf:e,periodFrom:n,periodTo:r,config:s,sizeBands:i,areas:o}=t;if(!st(e)||!Ze(n)||!Ze(r)||n>r||!T(s)||!w(s.ratePct)||!nt(s.downPaymentPct)||!rt(s.termYears)||!T(s.fees)||!Object.values(s.fees).every(w)||!Array.isArray(i)||i.length===0||i.length>20||!i.every(Ct)||!i.every((a,d)=>d===0||i[d-1].to<=a.from))return null;let l=i.map(a=>a.id);return!Qe(l)||!Array.isArray(o)||o.length===0||o.length>1e3||!o.every(a=>kt(a,l))||!Qe(o.map(a=>a.name))?null:t}var P=t=>t.toLocaleString("en-US");function _e(t,e){let n=t.findIndex(o=>e<o.size);if(n===0)return t[0].perSqm*e;if(n===-1)return t[t.length-1].perSqm*e;let r=t[n-1],s=t[n],i=r.perSqm*r.size;return i+(s.perSqm*s.size-i)*(e-r.size)/(s.size-r.size)}var et=t=>t.reduce((e,n)=>e+n[2],0),tt=(t,e)=>`${P(t)} ${t===1?e:`${e}s`}`;function Mt(t,e){let n=e.trim().toLowerCase();return n?t?.projects?.find(r=>r.name.toLowerCase()===n):void 0}function Se(t,e,n,r=""){let s=t.areas.find(u=>u.name===e),i=t.sizeBands.find(u=>n>=u.from&&n<u.to);if(!s||!i)return null;let o=u=>Math.max(u.from-n,n-u.to,0),l=t.sizeBands.filter(u=>it(s.bands[u.id])),a=l.includes(i)?i:l.reduce((u,R)=>!u||o(R)<o(u)?R:u,null);if(!a)return null;let d=s.bands[a.id],h=l.map(u=>s.bands[u.id]),c=Mt(s,r),f=u=>_e(u.map(([R,B])=>({size:R,perSqm:B})),n),g=c?.sales.length?f(c.sales):_e(h.map(u=>({size:u.saleSizeSqm,perSqm:u.salePerSqm})),n),v=c?.rents.length?f(c.rents):_e(h.map(u=>({size:u.rentSizeSqm,perSqm:u.rentPerSqmYear})),n),A=Math.round(g/1e3)*1e3,_=Math.round(v/12/100)*100;if(!y(A)||!y(_))return null;let m=a===t.sizeBands[t.sizeBands.length-1]?`${P(a.from)}+`:`${P(a.from)}\u2013${P(a.to)}`,pe=s.rentArea===s.name?"":` Rent is based on ${s.rentArea}.`;if(c){let u=tt(et(c.sales),"sale"),R=tt(et(c.rents),"rental contract"),B=`Estimate for ${c.name} from ${u} and ${R} in this project.`;return c.rents.length?c.sales.length||(B=`Rent for ${c.name} from ${R} in this project. Price is the ${s.name} estimate from ${P(d.sales)} sales at ${m} m\xB2: none in this project.`):B=`Price for ${c.name} from ${u} in this project. Rent is the ${s.rentArea} estimate from ${P(d.rents)} rental contracts at ${m} m\xB2: none in this project.`,{price:A,monthlyRent:_,caption:B}}let Z=`${P(d.sales)} sales and ${P(d.rents)} rental contracts`,Pe=a===i,we=Pe?`Estimate for ${s.name}, ${m} m\xB2, from ${Z}.`:`Estimate for ${s.name} based on ${m} m\xB2 flats, from ${Z}: too few deals at this size.`;return l.length>1&&(we=Pe?`Estimate for ${s.name}, smoothed across nearby sizes. At ${m} m\xB2: ${Z}.`:`Estimate for ${s.name} from nearby sizes: too few deals at this size. Closest, ${m} m\xB2: ${Z}.`),{price:A,monthlyRent:_,caption:we+pe}}function at(t,e){return e?{price:String(e.price),rent:String(e.monthlyRent),hintedPrice:!0,hintedRent:!0}:{price:t.hintedPrice?"":t.price,rent:t.hintedRent?"":t.rent,hintedPrice:!1,hintedRent:!1}}var D=t=>t===""?NaN:Number(t);function Nt({price:t,rent:e,downPaymentPct:n,ratePct:r,termYears:s}){return t!==""&&!y(D(t))?"Enter a property price above 0":e!==""&&!w(D(e))?"Rent cannot be negative":nt(D(n))?w(D(r))?rt(D(s))?null:"Term must be a whole number from 1 to 25 years":"Interest rate cannot be negative":"Down payment must be from 0 to 99%"}function lt(t,e){let n=Nt(t),r=D(t.rent),s=n||t.price===""?null:Ge({price:Number(t.price),monthlyRent:Number(t.rent),downPaymentPct:Number(t.downPaymentPct),ratePct:Number(t.ratePct),termYears:Number(t.termYears),fees:e});return{error:n,rent:w(r)?r:null,result:s}}function ct(t,e){let n=e??wt;return{downPaymentPct:t.downPaymentPct??String(n.downPaymentPct),ratePct:t.ratePct??String(n.ratePct),termYears:t.termYears??String(n.termYears)}}function dt({downPaymentPct:t,ratePct:e,termYears:n}){let r=s=>Number.isFinite(D(s))?String(Number(s)):"\u2014";return`Loan: ${r(t)}% down, ${r(e)}% rate, ${r(n)} ${Number(n)===1?"year":"years"}`}function j(t){return w(t)?`AED ${P(Math.round(t)+0)}`:"\u2014"}function pt(t,e){if(!y(t)||!w(e))return null;let n=Math.round(e)-Math.round(t);return{text:n===0?"The mortgage payment is about the same as rent.":`The mortgage payment is ${j(Math.abs(n))} a month ${n>0?"higher":"lower"} than rent.`,sign:Math.sign(n)}}var ce=t=>Et[Number(t)-1];function Ut(t,e){let[n,r]=t.split("-"),[s,i]=e.split("-");return`${n===s?ce(r):`${ce(r)} ${n}`}\u2013${ce(i)} ${s}`}function Ht(t){let[e,n,r]=t.split("-");return`${Number(r)} ${ce(n)} ${e}`}function ht(t){let e="Indicative estimates, not an offer or a valuation. Final terms and approval depend on the lender.";return t?`${e} Area and project estimates are median prices and rents from Dubai Land Department registrations, ${Ut(t.periodFrom,t.periodTo)}, data as of ${Ht(t.asOf)}. A specific property can differ significantly.`:e}var F=(t,e,n)=>$`
  <label>
    <span>${t}</span>
    <input type="number" inputmode="decimal" min="0" step="any" .value=${Ae(e)} @input=${r=>n(r.target.value)} />
  </label>
`,G=class extends C{constructor(){super();this.typingStart=null;this.pressedBackdrop=!1;this.status="manual",this.data=null,this.area="",this.size="",this.project="",this.money={price:"",rent:"",hintedPrice:!1,hintedRent:!1},this.edited={}}willUpdate(n){!n.has("dataUrl")||!this.dataUrl||(this.status="loading",fetch(this.dataUrl,{credentials:"omit"}).then(r=>r.ok?r.json():null).then(ot).catch(()=>null).then(r=>{this.data=r,this.status=r?"ready":"failed"}))}setPlace(n,r,s,i=this.money){this.area=n,this.size=r,this.project=s,this.money=at(i,this.data&&Se(this.data,n,Number(r),s))}openPanel(){this.renderRoot.querySelector("dialog").showModal()}closePanel(){this.renderRoot.querySelector("dialog").close()}closeOnBackdrop(n){this.pressedBackdrop&&n.target===n.currentTarget&&this.closePanel()}screen(){let{status:n,data:r,area:s,size:i,project:o,money:l,edited:a}=this,d=ct(a,r?.config),{error:h,rent:c,result:f}=lt({...l,...d},r?.config.fees),g=r&&Se(r,s,Number(i),o),v=r?.areas.find(m=>m.name===s)?.projects??[],A=pt(c,f?.monthlyPayment),_="";g&&(l.hintedPrice||l.hintedRent)?_=g.caption:r&&s&&i!==""&&!g&&!this.typingStart?_="No estimate for this size. Enter a size from 15 to 999 m\xB2 or your own numbers below.":n==="failed"&&(_="Area estimates are unavailable. Enter your own numbers.");let Q=m=>pe=>this.edited={...a,[m]:pe};return $`
      <h2 id="title">Rent or buy in Dubai</h2>
      <p class="lead">Choose an area and size to compare rent with a mortgage.</p>
      ${n==="loading"||n==="ready"?$`
            <div
              class="place"
              @focusout=${()=>{this.typingStart=null,this.requestUpdate()}}
            >
              <label>
                <span>Area</span>
                <select ?disabled=${n==="loading"} @change=${m=>this.setPlace(m.target.value,i,"")}>
                  <option value="">${n==="loading"?"Loading areas\u2026":"Select an area"}</option>
                  ${r?.areas.map(m=>$`<option value=${m.name}>${m.name}</option>`)}
                </select>
              </label>
              ${F("Size (m\xB2)",i,m=>this.setPlace(s,m,o,this.typingStart??(this.typingStart=l)))}
              ${v.length?$`
                    <label class="project">
                      <span>Building or project (optional)</span>
                      <input
                        list="projects"
                        autocomplete="off"
                        placeholder="Start typing a name"
                        .value=${Ae(o)}
                        @input=${m=>this.setPlace(s,i,m.target.value,this.typingStart??(this.typingStart=l))}
                      />
                      <datalist id="projects">${v.map(m=>$`<option value=${m.name}></option>`)}</datalist>
                    </label>
                  `:p}
            </div>
          `:p}
      <div aria-live="polite">${_?$`<p class="note">${_}</p>`:p}</div>
      <div aria-live="polite">
        ${h?$`<p class="error">${h}</p>`:p}
        <dl>
          <div>
            <dt>Rent per month</dt>
            <dd class="value">${j(c)}</dd>
          </div>
          <div>
            <dt>Mortgage payment per month</dt>
            <dd class="value">${j(f?.monthlyPayment)}</dd>
            ${f?.feesComplete?$`<dd class="note">Includes property and life insurance.</dd>`:p}
          </div>
        </dl>
        ${A?$`<p class="compare ${A.sign<0?"lower":A.sign>0?"higher":""}">${A.text}</p>`:p}
        <dl>
          <div>
            <dt>Property price</dt>
            <dd class="value">${j(f?Number(l.price):null)}</dd>
          </div>
          <div>
            <dt>Cash needed upfront</dt>
            <dd class="value">${j(f?.cashAtStart)}</dd>
            <dd class="note">Includes the down payment and purchase fees.</dd>
            ${f?.feesComplete===!1?$`<dd class="note">Some fees are not included yet, so the real amount may be higher.</dd>`:p}
          </div>
        </dl>
      </div>
      <details ?open=${n==="manual"||n==="failed"}>
        <summary>
          Change price, rent or loan
          <small>${dt(d)}</small>
        </summary>
        <div class="two">
          ${F("Property price (AED)",l.price,m=>this.money={...l,price:m,hintedPrice:!1})}
          ${F("Rent per month (AED)",l.rent,m=>this.money={...l,rent:m,hintedRent:!1})}
        </div>
        <div class="grid">
          ${F("Down payment (%)",d.downPaymentPct,Q("downPaymentPct"))}
          ${F("Interest rate (%)",d.ratePct,Q("ratePct"))}
          ${F("Term (years)",d.termYears,Q("termYears"))}
        </div>
      </details>
      <p class="fine">${ht(r)}</p>
    `}render(){return this.mode!=="floating"?$`<div class="root"><div class="panel">${this.screen()}</div></div>`:$`
      <div class="root">
        <button class="open" aria-haspopup="dialog" @click=${this.openPanel}>Rent or buy?</button>
        <dialog aria-labelledby="title" @pointerdown=${n=>this.pressedBackdrop=n.target===n.currentTarget} @click=${this.closeOnBackdrop}>
          <div class="panel">
            <button class="close" aria-label="Close" @click=${this.closePanel}>×</button>
            ${this.screen()}
          </div>
        </dialog>
      </div>
    `}};G.properties={mode:{},dataUrl:{attribute:"data-url"},status:{state:!0},data:{state:!0},area:{state:!0},size:{state:!0},project:{state:!0},money:{state:!0},edited:{state:!0}},G.styles=ue`
    :host,
    .root {
      all: initial;
      display: block;
      min-width: 0;
      max-width: 100%;
      font: 16px/1.5 var(--rvb-font, Lato, Arial, sans-serif);
      color: var(--ink);
      --ink: var(--rvb-ink, var(--mx-ink, #17372d));
      --leaf: var(--rvb-leaf, var(--mx-leaf, #3c9718));
      --lime: var(--rvb-lime, var(--mx-lime, #d9edaa));
      --cream: var(--rvb-cream, var(--mx-cream, #f7f5ef));
      --paper: var(--rvb-paper, var(--mx-paper, #fffefa));
      --muted: var(--rvb-muted, var(--mx-muted, #5e7168));
      --line: var(--rvb-line, var(--mx-line, #d7e0d4));
    }
    * {
      box-sizing: border-box;
    }
    :focus-visible {
      outline: 3px solid var(--leaf);
      outline-offset: 3px;
    }
    button,
    input,
    select {
      border-radius: 0;
      color: inherit;
      font: inherit;
    }
    button {
      cursor: pointer;
    }

    .open {
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 9999;
      min-height: 44px;
      padding: 10px 20px;
      border: 0;
      background: var(--ink);
      color: var(--paper);
      font-weight: 700;
    }
    .open:hover {
      background: #285940;
    }
    dialog {
      width: min(560px, 100vw - 16px);
      max-width: none;
      max-height: calc(100dvh - 16px);
      padding: 0;
      border: 0;
      overflow: auto;
      background: var(--paper);
      color: inherit;
    }
    dialog::backdrop {
      background: rgba(13, 45, 36, 0.55);
    }
    .close {
      position: sticky;
      top: 8px;
      float: right;
      width: 44px;
      height: 44px;
      margin: -12px -12px 0 0;
      padding: 0;
      border: 0;
      background: var(--paper);
      font-size: 28px;
      line-height: 1;
    }
    .close:hover {
      color: var(--leaf);
    }

    .panel {
      container-type: inline-size;
      width: 560px;
      max-width: 100%;
      padding: 20px;
      border: 1px solid var(--line);
      border-top: 6px solid var(--lime);
      background: var(--paper);
    }
    h2 {
      margin: 0;
      font: 400 28px/1.15 Georgia, serif;
      letter-spacing: -0.5px;
    }
    .lead {
      margin: 6px 0 16px;
      color: var(--muted);
    }
    label {
      display: block;
    }
    label span {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }
    input,
    select {
      display: block;
      width: 100%;
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--muted);
      background-color: var(--paper);
    }
    select:disabled {
      background-color: var(--cream);
      color: var(--muted);
    }
    .place,
    .grid,
    .two {
      display: grid;
      gap: 12px;
      align-items: end;
    }
    .place {
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    }
    .place .project {
      grid-column: 1 / -1;
    }
    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .two {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .note {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    details {
      margin-top: 12px;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    summary {
      position: relative;
      display: block;
      min-height: 44px;
      padding: 10px 28px 10px 0;
      font-weight: 700;
      cursor: pointer;
    }
    summary small {
      display: block;
      color: var(--muted);
      font-size: 14px;
      font-weight: 400;
      line-height: 1.3;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: '+';
      content: '+' / '';
      position: absolute;
      top: 10px;
      right: 6px;
      color: var(--leaf);
      font-size: 20px;
      line-height: 24px;
    }
    details[open] summary::after {
      content: '−';
      content: '−' / '';
    }
    details .grid,
    details .two {
      padding-bottom: 12px;
    }

    .error {
      margin: 12px 0 0;
      color: #b54838;
      font-weight: 700;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0 0;
    }
    dl > div {
      padding: 12px;
      border: 1px solid var(--line);
      background: var(--cream);
    }
    .compare {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin: 12px 0 0;
      padding: 12px 14px;
      border: 2px solid var(--line);
      border-radius: 8px;
      background: var(--cream);
      font-size: 18px;
      font-weight: 700;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .compare.lower {
      border-color: var(--leaf);
      background: #e1f0c1;
    }
    .compare.higher {
      border-color: #b54838;
      background: #fbe0dc;
    }
    /* Значок только для глаз: «lower» и «higher» уже есть в тексте, поэтому alt-текст пустой. */
    .compare.lower::before,
    .compare.higher::before {
      flex: none;
      font-size: 1.2em;
      line-height: 1;
    }
    .compare.lower::before {
      content: '✓';
      content: '✓' / '';
      color: var(--leaf);
    }
    .compare.higher::before {
      content: '✗';
      content: '✗' / '';
      color: #b54838;
    }
    dt {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }
    dd {
      margin: 0;
    }
    .value {
      margin-top: 4px;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .fine {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }
    @container (max-width: 460px) {
      .place,
      .grid,
      .two,
      dl {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;customElements.get("rent-vs-buy")||customElements.define("rent-vs-buy",G);})();
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
lit-html/directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive-helpers.js:
lit-html/directives/live.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
