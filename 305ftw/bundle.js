
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = key && { [key]: value };
            const child_ctx = assign(assign({}, info.ctx), info.resolved);
            const block = type && (info.current = type)(child_ctx);
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                flush();
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
        }
        if (is_promise(promise)) {
            promise.then(value => {
                update(info.then, 1, info.value, value);
            }, error => {
                update(info.catch, 2, info.error, error);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = { [info.value]: promise };
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/App.svelte generated by Svelte v3.6.7 */
    const { console: console_1 } = globals;

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.event = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.track = list[i];
    	return child_ctx;
    }

    // (166:0) {:else}
    function create_else_block(ctx) {
    	var button, dispose;

    	return {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Find backend";
    			attr(button, "class", "svelte-1tg273s");
    			add_location(button, file, 166, 0, 3395);
    			dispose = listen(button, "click", ctx.getBackend);
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (162:0) {#if backend }
    function create_if_block_3(ctx) {
    	var button, t1, input0, t2, input1, t3, dispose;

    	return {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Get tracks from watch";
    			t1 = space();
    			input0 = element("input");
    			t2 = text("days ago until\n  ");
    			input1 = element("input");
    			t3 = text("days ago");
    			attr(button, "class", "svelte-1tg273s");
    			add_location(button, file, 162, 2, 3184);
    			attr(input0, "type", "number");
    			attr(input0, "min", "0");
    			attr(input0, "size", "1");
    			add_location(input0, file, 163, 2, 3246);
    			attr(input1, "type", "number");
    			attr(input1, "min", "0");
    			attr(input1, "size", "1");
    			add_location(input1, file, 164, 2, 3321);

    			dispose = [
    				listen(button, "click", ctx.getTracks),
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    			insert(target, t1, anchor);
    			insert(target, input0, anchor);

    			input0.value = ctx.fromdays;

    			insert(target, t2, anchor);
    			insert(target, input1, anchor);

    			input1.value = ctx.todays;

    			insert(target, t3, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.fromdays) input0.value = ctx.fromdays;
    			if (changed.todays) input1.value = ctx.todays;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    				detach(t1);
    				detach(input0);
    				detach(t2);
    				detach(input1);
    				detach(t3);
    			}

    			run_all(dispose);
    		}
    	};
    }

    // (1:0)  <script>  export let name;  export let tracks;  export let events; let ips = [ '192.168.1.6', '192.168.1.8', '192.168.1.7', // testing   '172.20.10.2',   '172.20.10.3',   '172.20.10.4',   '172.20.10.5',   '172.20.10.6',   '172.20.10.7',   '172.20.10.8',   '172.20.10.9',   '172.20.10.10',   '172.20.10.11',   '172.20.10.12',   '172.20.10.13',   '172.20.10.14', ]; let backend; let id; let fromdays = 7; let todays = 0; let selectedevent; let selectedtrack; let checking_ll; let trackpromise; let gpspromise; let confirmpromise; let error = false; let liveloxuid; let ll_myself; let confirmed = false;  import { onMount }
    function create_catch_block_2(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		d: noop
    	};
    }

    // (1:0)  <script>  export let name;  export let tracks;  export let events; let ips = [ '192.168.1.6', '192.168.1.8', '192.168.1.7', // testing   '172.20.10.2',   '172.20.10.3',   '172.20.10.4',   '172.20.10.5',   '172.20.10.6',   '172.20.10.7',   '172.20.10.8',   '172.20.10.9',   '172.20.10.10',   '172.20.10.11',   '172.20.10.12',   '172.20.10.13',   '172.20.10.14', ]; let backend; let id; let fromdays = 7; let todays = 0; let selectedevent; let selectedtrack; let checking_ll; let trackpromise; let gpspromise; let confirmpromise; let error = false; let liveloxuid; let ll_myself; let confirmed = false;  import { onMount }
    function create_then_block_2(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		d: noop
    	};
    }

    // (170:19)  <i class="fas fa-spinner fa-spin"></i>Fetching GPS data from watch {/await}
    function create_pending_block_2(ctx) {
    	var i, t;

    	return {
    		c: function create() {
    			i = element("i");
    			t = text("Fetching GPS data from watch");
    			attr(i, "class", "fas fa-spinner fa-spin");
    			add_location(i, file, 170, 0, 3479);
    		},

    		m: function mount(target, anchor) {
    			insert(target, i, anchor);
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(i);
    				detach(t);
    			}
    		}
    	};
    }

    // (175:0) {#if error}
    function create_if_block_2(ctx) {
    	var article, t0, t1;

    	return {
    		c: function create() {
    			article = element("article");
    			t0 = text("An error occurred:\n");
    			t1 = text(ctx.error);
    			attr(article, "class", "svelte-1tg273s");
    			add_location(article, file, 175, 0, 3575);
    		},

    		m: function mount(target, anchor) {
    			insert(target, article, anchor);
    			append(article, t0);
    			append(article, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.error) {
    				set_data(t1, ctx.error);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(article);
    			}
    		}
    	};
    }

    // (1:0)  <script>  export let name;  export let tracks;  export let events; let ips = [ '192.168.1.6', '192.168.1.8', '192.168.1.7', // testing   '172.20.10.2',   '172.20.10.3',   '172.20.10.4',   '172.20.10.5',   '172.20.10.6',   '172.20.10.7',   '172.20.10.8',   '172.20.10.9',   '172.20.10.10',   '172.20.10.11',   '172.20.10.12',   '172.20.10.13',   '172.20.10.14', ]; let backend; let id; let fromdays = 7; let todays = 0; let selectedevent; let selectedtrack; let checking_ll; let trackpromise; let gpspromise; let confirmpromise; let error = false; let liveloxuid; let ll_myself; let confirmed = false;  import { onMount }
    function create_catch_block_1(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		d: noop
    	};
    }

    // (204:2) {:then }
    function create_then_block_1(ctx) {
    	var button, dispose;

    	function click_handler() {
    		return ctx.click_handler(ctx);
    	}

    	return {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Check livelox";
    			attr(button, "class", "svelte-1tg273s");
    			add_location(button, file, 204, 2, 4070);
    			dispose = listen(button, "click", click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (199:23)    <button disabled>Check livelox</button>   {#if selectedtrack === track.id}
    function create_pending_block_1(ctx) {
    	var button, t_1, if_block_anchor;

    	var if_block = (ctx.selectedtrack === ctx.track.id) && create_if_block_1();

    	return {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Check livelox";
    			t_1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			button.disabled = true;
    			attr(button, "class", "svelte-1tg273s");
    			add_location(button, file, 199, 2, 3932);
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    			insert(target, t_1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.selectedtrack === ctx.track.id) {
    				if (!if_block) {
    					if_block = create_if_block_1();
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    				detach(t_1);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (201:2) {#if selectedtrack === track.id}
    function create_if_block_1(ctx) {
    	var i;

    	return {
    		c: function create() {
    			i = element("i");
    			attr(i, "class", "fas fa-spinner fa-pulse");
    			add_location(i, file, 201, 2, 4009);
    		},

    		m: function mount(target, anchor) {
    			insert(target, i, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(i);
    			}
    		}
    	};
    }

    // (192:0) {#each tracks as track}
    function create_each_block_1(ctx) {
    	var tr, td0, t0_value = ctx.track.starttime, t0, t1, td1, t2_value = ctx.track.dur_min, t2, t3, t4_value = String(ctx.track.dur_sec).padStart(2, '0'), t4, t5, td2, promise, t6;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block_1,
    		value: 'null',
    		error: 'null'
    	};

    	handle_promise(promise = ctx.trackpromise, info);

    	return {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = text(":");
    			t4 = text(t4_value);
    			t5 = space();
    			td2 = element("td");

    			info.block.c();

    			t6 = space();
    			attr(td0, "class", "svelte-1tg273s");
    			add_location(td0, file, 195, 0, 3808);
    			attr(td1, "class", "svelte-1tg273s");
    			add_location(td1, file, 196, 0, 3835);
    			attr(td2, "class", "svelte-1tg273s");
    			add_location(td2, file, 197, 0, 3901);
    			attr(tr, "class", "svelte-1tg273s");
    			toggle_class(tr, "active", ctx.selectedtrack === ctx.track.id);
    			add_location(tr, file, 193, 0, 3758);
    		},

    		m: function mount(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);
    			append(td1, t2);
    			append(td1, t3);
    			append(td1, t4);
    			append(tr, t5);
    			append(tr, td2);

    			info.block.m(td2, info.anchor = null);
    			info.mount = () => td2;
    			info.anchor = null;

    			append(tr, t6);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.tracks) && t0_value !== (t0_value = ctx.track.starttime)) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.tracks) && t2_value !== (t2_value = ctx.track.dur_min)) {
    				set_data(t2, t2_value);
    			}

    			if ((changed.tracks) && t4_value !== (t4_value = String(ctx.track.dur_sec).padStart(2, '0'))) {
    				set_data(t4, t4_value);
    			}

    			info.ctx = ctx;

    			if (('trackpromise' in changed) && promise !== (promise = ctx.trackpromise) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}

    			if ((changed.selectedtrack || changed.tracks)) {
    				toggle_class(tr, "active", ctx.selectedtrack === ctx.track.id);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(tr);
    			}

    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};
    }

    // (1:0)  <script>  export let name;  export let tracks;  export let events; let ips = [ '192.168.1.6', '192.168.1.8', '192.168.1.7', // testing   '172.20.10.2',   '172.20.10.3',   '172.20.10.4',   '172.20.10.5',   '172.20.10.6',   '172.20.10.7',   '172.20.10.8',   '172.20.10.9',   '172.20.10.10',   '172.20.10.11',   '172.20.10.12',   '172.20.10.13',   '172.20.10.14', ]; let backend; let id; let fromdays = 7; let todays = 0; let selectedevent; let selectedtrack; let checking_ll; let trackpromise; let gpspromise; let confirmpromise; let error = false; let liveloxuid; let ll_myself; let confirmed = false;  import { onMount }
    function create_catch_block(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		d: noop
    	};
    }

    // (226:2) {:then }
    function create_then_block(ctx) {
    	var button, dispose;

    	function click_handler_1() {
    		return ctx.click_handler_1(ctx);
    	}

    	return {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Upload to this event";
    			attr(button, "class", "svelte-1tg273s");
    			add_location(button, file, 226, 2, 4522);
    			dispose = listen(button, "click", click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (221:25)    <button disabled>Upload to this event</button>   {#if selectedevent === event.id}
    function create_pending_block(ctx) {
    	var button, t_1, if_block_anchor;

    	var if_block = (ctx.selectedevent === ctx.event.id) && create_if_block();

    	return {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Upload to this event";
    			t_1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			button.disabled = true;
    			attr(button, "class", "svelte-1tg273s");
    			add_location(button, file, 221, 2, 4377);
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    			insert(target, t_1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.selectedevent === ctx.event.id) {
    				if (!if_block) {
    					if_block = create_if_block();
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    				detach(t_1);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (223:2) {#if selectedevent === event.id}
    function create_if_block(ctx) {
    	var i;

    	return {
    		c: function create() {
    			i = element("i");
    			attr(i, "class", "fas fa-spinner fa-pulse");
    			add_location(i, file, 223, 2, 4461);
    		},

    		m: function mount(target, anchor) {
    			insert(target, i, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(i);
    			}
    		}
    	};
    }

    // (217:0) {#each events as event}
    function create_each_block(ctx) {
    	var tr, td0, t0_value = ctx.event.eventname, t0, t1, t2_value = ctx.event.name, t2, t3, td1, promise, t4;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 'null',
    		error: 'null'
    	};

    	handle_promise(promise = ctx.confirmpromise, info);

    	return {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = text(", ");
    			t2 = text(t2_value);
    			t3 = space();
    			td1 = element("td");

    			info.block.c();

    			t4 = space();
    			attr(td0, "class", "svelte-1tg273s");
    			add_location(td0, file, 218, 0, 4302);
    			attr(td1, "class", "svelte-1tg273s");
    			add_location(td1, file, 219, 0, 4344);
    			attr(tr, "class", "svelte-1tg273s");
    			toggle_class(tr, "active", ctx.selectedevent === ctx.event.id);
    			add_location(tr, file, 217, 0, 4253);
    		},

    		m: function mount(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(td0, t1);
    			append(td0, t2);
    			append(tr, t3);
    			append(tr, td1);

    			info.block.m(td1, info.anchor = null);
    			info.mount = () => td1;
    			info.anchor = null;

    			append(tr, t4);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.events) && t0_value !== (t0_value = ctx.event.eventname)) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.events) && t2_value !== (t2_value = ctx.event.name)) {
    				set_data(t2, t2_value);
    			}

    			info.ctx = ctx;

    			if (('confirmpromise' in changed) && promise !== (promise = ctx.confirmpromise) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}

    			if ((changed.selectedevent || changed.events)) {
    				toggle_class(tr, "active", ctx.selectedevent === ctx.event.id);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(tr);
    			}

    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};
    }

    function create_fragment(ctx) {
    	var h1, t1, t2, div, promise, t3, t4, h30, t6, table0, thead, tr, th0, t8, th1, t10, th2, t11, tbody0, t12, h31, t14, table1, tbody1;

    	function select_block_type(ctx) {
    		if (ctx.backend) return create_if_block_3;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block0 = current_block_type(ctx);

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_2,
    		then: create_then_block_2,
    		catch: create_catch_block_2,
    		value: 'null',
    		error: 'null'
    	};

    	handle_promise(promise = ctx.gpspromise, info);

    	var if_block1 = (ctx.error) && create_if_block_2(ctx);

    	var each_value_1 = ctx.tracks;

    	var each_blocks_1 = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	var each_value = ctx.events;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "305FTW: automates garmin-USB to livelox.com";
    			t1 = space();
    			if_block0.c();
    			t2 = space();
    			div = element("div");

    			info.block.c();

    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			h30 = element("h3");
    			h30.textContent = "Tracks";
    			t6 = space();
    			table0 = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Start";
    			t8 = space();
    			th1 = element("th");
    			th1.textContent = "Duration";
    			t10 = space();
    			th2 = element("th");
    			t11 = space();
    			tbody0 = element("tbody");

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t12 = space();
    			h31 = element("h3");
    			h31.textContent = "Events";
    			t14 = space();
    			table1 = element("table");
    			tbody1 = element("tbody");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(h1, "class", "svelte-1tg273s");
    			add_location(h1, file, 160, 0, 3114);
    			add_location(div, file, 168, 0, 3453);
    			add_location(h30, file, 181, 0, 3630);
    			attr(th0, "class", "svelte-1tg273s");
    			add_location(th0, file, 185, 0, 3667);
    			attr(th1, "class", "svelte-1tg273s");
    			add_location(th1, file, 186, 0, 3682);
    			attr(th2, "class", "svelte-1tg273s");
    			add_location(th2, file, 187, 0, 3700);
    			attr(tr, "class", "svelte-1tg273s");
    			add_location(tr, file, 184, 0, 3662);
    			add_location(thead, file, 183, 0, 3654);
    			add_location(tbody0, file, 190, 0, 3725);
    			attr(table0, "class", "svelte-1tg273s");
    			add_location(table0, file, 182, 0, 3646);
    			add_location(h31, file, 213, 0, 4197);
    			add_location(tbody1, file, 215, 0, 4221);
    			attr(table1, "class", "svelte-1tg273s");
    			add_location(table1, file, 214, 0, 4213);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			if_block0.m(target, anchor);
    			insert(target, t2, anchor);
    			insert(target, div, anchor);

    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;

    			insert(target, t3, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t4, anchor);
    			insert(target, h30, anchor);
    			insert(target, t6, anchor);
    			insert(target, table0, anchor);
    			append(table0, thead);
    			append(thead, tr);
    			append(tr, th0);
    			append(tr, t8);
    			append(tr, th1);
    			append(tr, t10);
    			append(tr, th2);
    			append(table0, t11);
    			append(table0, tbody0);

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(tbody0, null);
    			}

    			insert(target, t12, anchor);
    			insert(target, h31, anchor);
    			insert(target, t14, anchor);
    			insert(target, table1, anchor);
    			append(table1, tbody1);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody1, null);
    			}
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(t2.parentNode, t2);
    				}
    			}

    			info.ctx = ctx;

    			('gpspromise' in changed) && promise !== (promise = ctx.gpspromise) && handle_promise(promise, info);

    			if (ctx.error) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(t4.parentNode, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (changed.selectedtrack || changed.tracks || changed.trackpromise) {
    				each_value_1 = ctx.tracks;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tbody0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_1.length;
    			}

    			if (changed.selectedevent || changed.events || changed.confirmpromise) {
    				each_value = ctx.events;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    			}

    			if_block0.d(detaching);

    			if (detaching) {
    				detach(t2);
    				detach(div);
    			}

    			info.block.d();
    			info.token = null;
    			info = null;

    			if (detaching) {
    				detach(t3);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach(t4);
    				detach(h30);
    				detach(t6);
    				detach(table0);
    			}

    			destroy_each(each_blocks_1, detaching);

    			if (detaching) {
    				detach(t12);
    				detach(h31);
    				detach(t14);
    				detach(table1);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { name, tracks, events } = $$props;
    let ips = [
    '192.168.1.6', '192.168.1.8', '192.168.1.7', // testing
      '172.20.10.2',
      '172.20.10.3',
      '172.20.10.4',
      '172.20.10.5',
      '172.20.10.6',
      '172.20.10.7',
      '172.20.10.8',
      '172.20.10.9',
      '172.20.10.10',
      '172.20.10.11',
      '172.20.10.12',
      '172.20.10.13',
      '172.20.10.14',
    ];
    let backend;
    let id;
    let fromdays = 7;
    let todays = 0;
    let selectedevent;
    let selectedtrack;
    let trackpromise;
    let gpspromise;
    let confirmpromise;
    let error = false;
    let liveloxuid;
    let ll_myself;

    function getBackend() {
      $$invalidate('error', error = false);
      for (let ip of ips) {
        let test = 'http://' + ip + ':5000';
        fetch(test)
          .then(response => response.json())
          .then(data => {
            data['status'] === 'ok' ? backend = test : false; $$invalidate('backend', backend);
          })
          .catch(err => {
            console.log(err);
            backend ? false : error = 'Could not connect to tethered backend'; $$invalidate('error', error);
          });
      }
    }

    function getTracks() {
      $$invalidate('error', error = false);
      $$invalidate('tracks', tracks = []);
      $$invalidate('events', events = []);
      $$invalidate('gpspromise', gpspromise = fetch(backend + '/tracks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({fromdays: fromdays, todays: todays}),
      })
      .then(response => response.json())
      .then(data => {
        $$invalidate('tracks', tracks = data['tracks']);
        id = data['id'];
        })
      .catch(err => {
        console.log(err);
        $$invalidate('error', error = 'Could not fetch GPS data from watch');
      }));
    }

    function checktrack(trackid) {
      $$invalidate('error', error = false);
      $$invalidate('events', events = []);
      $$invalidate('selectedtrack', selectedtrack = trackid);
      $$invalidate('trackpromise', trackpromise = fetch(backend + '/loxcheck', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: id, track: trackid}),
      })
        .then(response => response.json())
        .then(data => {
          $$invalidate('events', events = data['events']);
          liveloxuid = data['lluid'];
          ll_myself = data['myself'];
        })
      //trackpromise = new Promise(res => setTimeout(res, 2000))
      //.then(d => { console.log('tracks fetched')})
      .catch(err => {
        console.log(err);
        $$invalidate('error', error = 'Error contacting livelox.com');
        $$invalidate('selectedtrack', selectedtrack = false);
        }));
    }
    function confirmTrackEvent(eventclassid) {
      $$invalidate('error', error = false);
      $$invalidate('confirmpromise', confirmpromise = fetch(backend + '/loxdone', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id: id,
          classid: eventclassid,
          lluid: liveloxuid,
          myself: ll_myself,
          }),
      })
      .then(d => {})
      .catch(err => {
        console.log(err);
        $$invalidate('error', error = 'Error confirming livelox event upload');
        }));
    }


    onMount(() => {
      getBackend();
    });

    	const writable_props = ['name', 'tracks', 'events'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		fromdays = to_number(this.value);
    		$$invalidate('fromdays', fromdays);
    	}

    	function input1_input_handler() {
    		todays = to_number(this.value);
    		$$invalidate('todays', todays);
    	}

    	function click_handler({ track }) {checktrack(track.id);}

    	function click_handler_1({ event }) {confirmTrackEvent(event.id);}

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('tracks' in $$props) $$invalidate('tracks', tracks = $$props.tracks);
    		if ('events' in $$props) $$invalidate('events', events = $$props.events);
    	};

    	return {
    		name,
    		tracks,
    		events,
    		backend,
    		fromdays,
    		todays,
    		selectedevent,
    		selectedtrack,
    		trackpromise,
    		gpspromise,
    		confirmpromise,
    		error,
    		getBackend,
    		getTracks,
    		checktrack,
    		confirmTrackEvent,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler,
    		click_handler_1
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["name", "tracks", "events"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console_1.warn("<App> was created without expected prop 'name'");
    		}
    		if (ctx.tracks === undefined && !('tracks' in props)) {
    			console_1.warn("<App> was created without expected prop 'tracks'");
    		}
    		if (ctx.events === undefined && !('events' in props)) {
    			console_1.warn("<App> was created without expected prop 'events'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tracks() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tracks(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get events() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set events(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	  tracks: [],
    	  events: [],
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
