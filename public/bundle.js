
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
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
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
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
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
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
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.12.1 */

    function create_fragment(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); validate_store(routes, 'routes'); component_subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	const writable_props = ['basepath', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { basepath, url, hasActiveRoute, $base, $location, $routes };
    	};

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('$routes' in $$props) routes.set($routes);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["basepath", "url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Router", options, id: create_fragment.name });
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.12.1 */

    const get_default_slot_changes = ({ routeParams, $location }) => ({ params: routeParams, location: $location });
    const get_default_slot_context = ({ routeParams, $location }) => ({
    	params: routeParams,
    	location: $location
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}", ctx });
    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && (changed.$$scope || changed.routeParams || changed.$location)) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(43:2) {:else}", ctx });
    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		{ location: ctx.$location },
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = (changed.$location || changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    									(changed.$location) && { location: ctx.$location },
    			(changed.routeParams) && get_spread_object(ctx.routeParams),
    			(changed.routeProps) && get_spread_object(ctx.routeProps)
    								]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(41:2) {#if component !== null}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute, $location;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); validate_store(activeRoute, 'activeRoute'); component_subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$new_props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate('component', component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { path, component, routeParams, routeProps, $activeRoute, $location };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$props) $$invalidate('component', component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate('routeParams', routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate('routeProps', routeProps = $$new_props.routeProps);
    		if ('$activeRoute' in $$props) activeRoute.set($activeRoute);
    		if ('$location' in $$props) location.set($location);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Route", options, id: create_fragment$1.name });
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.12.1 */

    const file = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$2(ctx) {
    	var a, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var a_levels = [
    		{ href: ctx.href },
    		{ "aria-current": ctx.ariaCurrent },
    		ctx.props
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			set_attributes(a, a_data);
    			add_location(a, file, 40, 0, 1249);
    			dispose = listen_dev(a, "click", ctx.onClick);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.href) && { href: ctx.href },
    				(changed.ariaCurrent) && { "aria-current": ctx.ariaCurrent },
    				(changed.props) && ctx.props
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $base, $location;

    	

      let { to = "#", replace = false, state = {}, getProps = () => ({}) } = $$props;

      const { base } = getContext(ROUTER); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });
      const dispatch = createEventDispatcher();

      let href, isPartiallyCurrent, isCurrent, props;

      function onClick(event) {
        dispatch("click", event);

        if (shouldNavigate(event)) {
          event.preventDefault();
          // Don't push another entry to the history stack when the user
          // clicks on a Link to the page they are currently on.
          const shouldReplace = $location.pathname === href || replace;
          navigate(href, { state, replace: shouldReplace });
        }
      }

    	const writable_props = ['to', 'replace', 'state', 'getProps'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { to, replace, state, getProps, href, isPartiallyCurrent, isCurrent, props, $base, $location, ariaCurrent };
    	};

    	$$self.$inject_state = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('isPartiallyCurrent' in $$props) $$invalidate('isPartiallyCurrent', isPartiallyCurrent = $$props.isPartiallyCurrent);
    		if ('isCurrent' in $$props) $$invalidate('isCurrent', isCurrent = $$props.isCurrent);
    		if ('props' in $$props) $$invalidate('props', props = $$props.props);
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('ariaCurrent' in $$props) $$invalidate('ariaCurrent', ariaCurrent = $$props.ariaCurrent);
    	};

    	let ariaCurrent;

    	$$self.$$.update = ($$dirty = { to: 1, $base: 1, $location: 1, href: 1, isCurrent: 1, getProps: 1, isPartiallyCurrent: 1 }) => {
    		if ($$dirty.to || $$dirty.$base) { $$invalidate('href', href = to === "/" ? $base.uri : resolve(to, $base.uri)); }
    		if ($$dirty.$location || $$dirty.href) { $$invalidate('isPartiallyCurrent', isPartiallyCurrent = startsWith($location.pathname, href)); }
    		if ($$dirty.href || $$dirty.$location) { $$invalidate('isCurrent', isCurrent = href === $location.pathname); }
    		if ($$dirty.isCurrent) { $$invalidate('ariaCurrent', ariaCurrent = isCurrent ? "page" : undefined); }
    		if ($$dirty.getProps || $$dirty.$location || $$dirty.href || $$dirty.isPartiallyCurrent || $$dirty.isCurrent) { $$invalidate('props', props = getProps({
            location: $location,
            href,
            isPartiallyCurrent,
            isCurrent
          })); }
    	};

    	return {
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		href,
    		props,
    		onClick,
    		ariaCurrent,
    		$$slots,
    		$$scope
    	};
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["to", "replace", "state", "getProps"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Link", options, id: create_fragment$2.name });
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    /**
     * lodash (Custom Build) <https://lodash.com/>
     * Build: `lodash modularize exports="npm" -o ./`
     * Copyright jQuery Foundation and other contributors <https://jquery.org/>
     * Released under MIT license <https://lodash.com/license>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     */

    /** Used as the `TypeError` message for "Functions" methods. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED = '__lodash_hash_undefined__';

    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0;

    /** `Object#toString` result references. */
    var funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        symbolTag = '[object Symbol]';

    /** Used to match property names within property paths. */
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
        reIsPlainProp = /^\w*$/,
        reLeadingDot = /^\./,
        rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to match backslashes in property paths. */
    var reEscapeChar = /\\(\\)?/g;

    /** Used to detect host constructors (Safari). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = freeGlobal || freeSelf || Function('return this')();

    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    /**
     * Checks if `value` is a host object in IE < 9.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
     */
    function isHostObject(value) {
      // Many host objects are `Object` objects that can coerce to strings
      // despite having improperly defined `toString` methods.
      var result = false;
      if (value != null && typeof value.toString != 'function') {
        try {
          result = !!(value + '');
        } catch (e) {}
      }
      return result;
    }

    /** Used for built-in method references. */
    var arrayProto = Array.prototype,
        funcProto = Function.prototype,
        objectProto = Object.prototype;

    /** Used to detect overreaching core-js shims. */
    var coreJsData = root['__core-js_shared__'];

    /** Used to detect methods masquerading as native. */
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
      return uid ? ('Symbol(src)_1.' + uid) : '';
    }());

    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var objectToString = objectProto.toString;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /** Built-in value references. */
    var Symbol$1 = root.Symbol,
        splice = arrayProto.splice;

    /* Built-in method references that are verified to be native. */
    var Map$1 = getNative(root, 'Map'),
        nativeCreate = getNative(Object, 'create');

    /** Used to convert symbols to primitives and strings. */
    var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined,
        symbolToString = symbolProto ? symbolProto.toString : undefined;

    /**
     * Creates a hash object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Hash(entries) {
      var index = -1,
          length = entries ? entries.length : 0;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    /**
     * Removes all key-value entries from the hash.
     *
     * @private
     * @name clear
     * @memberOf Hash
     */
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
    }

    /**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @name delete
     * @memberOf Hash
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function hashDelete(key) {
      return this.has(key) && delete this.__data__[key];
    }

    /**
     * Gets the hash value for `key`.
     *
     * @private
     * @name get
     * @memberOf Hash
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? undefined : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : undefined;
    }

    /**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Hash
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
    }

    /**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Hash
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the hash instance.
     */
    function hashSet(key, value) {
      var data = this.__data__;
      data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
      return this;
    }

    // Add methods to `Hash`.
    Hash.prototype.clear = hashClear;
    Hash.prototype['delete'] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;

    /**
     * Creates an list cache object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function ListCache(entries) {
      var index = -1,
          length = entries ? entries.length : 0;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    /**
     * Removes all key-value entries from the list cache.
     *
     * @private
     * @name clear
     * @memberOf ListCache
     */
    function listCacheClear() {
      this.__data__ = [];
    }

    /**
     * Removes `key` and its value from the list cache.
     *
     * @private
     * @name delete
     * @memberOf ListCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function listCacheDelete(key) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      return true;
    }

    /**
     * Gets the list cache value for `key`.
     *
     * @private
     * @name get
     * @memberOf ListCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function listCacheGet(key) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      return index < 0 ? undefined : data[index][1];
    }

    /**
     * Checks if a list cache value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf ListCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }

    /**
     * Sets the list cache `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf ListCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the list cache instance.
     */
    function listCacheSet(key, value) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      if (index < 0) {
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }

    // Add methods to `ListCache`.
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype['delete'] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;

    /**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function MapCache(entries) {
      var index = -1,
          length = entries ? entries.length : 0;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    /**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */
    function mapCacheClear() {
      this.__data__ = {
        'hash': new Hash,
        'map': new (Map$1 || ListCache),
        'string': new Hash
      };
    }

    /**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function mapCacheDelete(key) {
      return getMapData(this, key)['delete'](key);
    }

    /**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }

    /**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }

    /**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache instance.
     */
    function mapCacheSet(key, value) {
      getMapData(this, key).set(key, value);
      return this;
    }

    // Add methods to `MapCache`.
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype['delete'] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;

    /**
     * Gets the index at which the `key` is found in `array` of key-value pairs.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * The base implementation of `_.get` without support for default values.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @returns {*} Returns the resolved value.
     */
    function baseGet(object, path) {
      path = isKey(path, object) ? [path] : castPath(path);

      var index = 0,
          length = path.length;

      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return (index && index == length) ? object : undefined;
    }

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }

    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    /**
     * Casts `value` to a path array if it's not one.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {Array} Returns the cast property path array.
     */
    function castPath(value) {
      return isArray(value) ? value : stringToPath(value);
    }

    /**
     * Gets the data for `map`.
     *
     * @private
     * @param {Object} map The map to query.
     * @param {string} key The reference key.
     * @returns {*} Returns the map data.
     */
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key)
        ? data[typeof key == 'string' ? 'string' : 'hash']
        : data.map;
    }

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : undefined;
    }

    /**
     * Checks if `value` is a property name and not a property path.
     *
     * @private
     * @param {*} value The value to check.
     * @param {Object} [object] The object to query keys on.
     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
     */
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      var type = typeof value;
      if (type == 'number' || type == 'symbol' || type == 'boolean' ||
          value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
        (object != null && value in Object(object));
    }

    /**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */
    function isKeyable(value) {
      var type = typeof value;
      return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
        ? (value !== '__proto__')
        : (value === null);
    }

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    /**
     * Converts `string` to a property path array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the property path array.
     */
    var stringToPath = memoize(function(string) {
      string = toString(string);

      var result = [];
      if (reLeadingDot.test(string)) {
        result.push('');
      }
      string.replace(rePropName, function(match, number, quote, string) {
        result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
      });
      return result;
    });

    /**
     * Converts `value` to a string key if it's not a string or symbol.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {string|symbol} Returns the key.
     */
    function toKey(value) {
      if (typeof value == 'string' || isSymbol(value)) {
        return value;
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to process.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {}
        try {
          return (func + '');
        } catch (e) {}
      }
      return '';
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided, it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the
     * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoized function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */
    function memoize(func, resolver) {
      if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments,
            key = resolver ? resolver.apply(this, args) : args[0],
            cache = memoized.cache;

        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result);
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache);
      return memoized;
    }

    // Assign cache to `_.memoize`.
    memoize.Cache = MapCache;

    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray = Array.isArray;

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 8-9 which returns 'object' for typed array and other constructors.
      var tag = isObject(value) ? objectToString.call(value) : '';
      return tag == funcTag || tag == genTag;
    }

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function');
    }

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return !!value && typeof value == 'object';
    }

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike(value) && objectToString.call(value) == symbolTag);
    }

    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
      return value == null ? '' : baseToString(value);
    }

    /**
     * Gets the value at `path` of `object`. If the resolved value is
     * `undefined`, the `defaultValue` is returned in its place.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.get(object, 'a[0].b.c');
     * // => 3
     *
     * _.get(object, ['a', '0', 'b', 'c']);
     * // => 3
     *
     * _.get(object, 'a.b.c', 'default');
     * // => 'default'
     */
    function get(object, path, defaultValue) {
      var result = object == null ? undefined : baseGet(object, path);
      return result === undefined ? defaultValue : result;
    }

    var lodash_get = get;

    var justThrottle = throttle;

    function throttle(fn, interval, callFirst) {
      var wait = false;
      var callNow = false;
      return function() {
        callNow = callFirst && !wait;
        var context = this;
        var args = arguments;
        if (!wait) {
          wait = true;
          setTimeout(function() {
            wait = false;
            if (!callFirst) {
              return fn.apply(context, args);
            }
          }, interval);
        }
        if (callNow) {
          callNow = false;
          return fn.apply(this, arguments);
        }
      };
    }

    const orbBackgroundOne = writable('rgba(0,0,255,1)');
    const orbBackgroundTwo = writable('rgba(0,0,255,1)');
    const orbColorOne = writable('rgba(0,0,0,1)');
    const orbColorTwo = writable('rgba(255,255,255,1)');
    const menuActive = writable(false);
    const erosionMachineCounter = writable(0);
    const erosionMachineActive = writable(false);
    const activePage = writable('');

    /* src/eeefff/ErosionMachine.svelte generated by Svelte v3.12.1 */
    const { window: window_1 } = globals;

    const file$1 = "src/eeefff/ErosionMachine.svelte";

    function create_fragment$3(ctx) {
    	var section, dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			attr_dev(section, "class", "erosion-machine-container svelte-dqk8g3");
    			toggle_class(section, "hidden", ctx.hidden);
    			add_location(section, file$1, 421, 0, 10881);
    			dispose = listen_dev(window_1, "mousemove", justThrottle(ctx.handleMouseMove, 200));
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			ctx.section_binding(section);
    		},

    		p: function update(changed, ctx) {
    			if (changed.hidden) {
    				toggle_class(section, "hidden", ctx.hidden);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			ctx.section_binding(null);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    const EEEFFF_JSON =
        "https://dev.eeefff.org/data/outsourcing-paradise-parasite/erosion-machine-timeline.json";

    function instance$3($$self, $$props, $$invalidate) {
    	let $activePage;

    	validate_store(activePage, 'activePage');
    	component_subscribe($$self, activePage, $$value => { $activePage = $$value; $$invalidate('$activePage', $activePage); });

    	

      let hidden = false;

      // *** DOM References
      let erosionMachineContainer = {};

      // *** VARIABLES
      let counter = 0;
      let playedEvents = [];
      let timeline = new TimelineMax({
        paused: true,
        onUpdate: function() {
          console.log(Math.round(this.time()));
        }
      });

      const setRandomPosition = el => {
        el.style.top =
          Math.floor(Math.random() * (window.innerHeight - el.clientHeight)) + "px";
        el.style.left =
          Math.floor(Math.random() * (window.innerWidth - el.clientWidth)) + "px";
      };

      const addElement = event => {
        if (!event.type) {
          console.error("💥 Event has no type");
          return false;
        }

        if (event.type === "addClass" || event.type === "removeClass") {
          return event;
        }

        if (event.type === "assemblage") {
          return {
            type: "assemblage",
            duration: event.duration,
            events: event.events.map(e => addElement(e))
          };
        }

        // +++ Create DOM element
        let elementObject = document.createElement(
          event.type === "showVideo" ? "video" : "div"
        );

        // +++ Add ID
        elementObject.id = Math.random()
          .toString(36)
          .substring(2, 15);

        // +++ Hide elemenmt
        elementObject.style.opacity = 0;

        // +++ Set z-index
        elementObject.style.zIndex = 1001;

        // +++ Add classes
        elementObject.classList = event.class ? event.class : "";

        // +++ Add text
        elementObject.innerText = event.text ? event.text : "";

        // +++ Add position
        elementObject.style.position = event.position ? event.position : "inherit";

        // +++ Video attributes
        if (event.type === "showVideo") {
          let sourceElement = document.createElement("source");
          sourceElement.src = event.url_mp4 ? event.url_mp4 : "";
          sourceElement.type = "video/mp4";
          elementObject.appendChild(sourceElement);
          elementObject.loop = event.loop ? event.loop : "";
          elementObject.preload = "auto";

          // +++ Subtitles
          if (event.subtitles_en) {
            let subtitlesTrack = document.createElement("track");
            subtitlesTrack.kind = "subtitles";
            subtitlesTrack.label = "English subtitles";
            subtitlesTrack.src = event.subtitles_en;
            // subtitlesTrack.src = "/subtitles_test.vtt";
            subtitlesTrack.srcLang = "en";
            subtitlesTrack.default = true;
            // let subtitlesBox = document.createElement("div");
            elementObject.appendChild(subtitlesTrack);
            // elementObject.appendChild(subtitlesBox);
          }
          if (event.subtitles_ru) {
            let subtitlesTrackRu = document.createElement("track");
            subtitlesTrackRu.kind = "subtitles";
            subtitlesTrackRu.label = "Russian subtitles";
            subtitlesTrackRu.src = event.subtitles_ru;
            // subtitlesTrack.src = "/subtitles_test.vtt";
            subtitlesTrackRu.srcLang = "ru";
            subtitlesTrackRu.default = true;
            // let subtitlesBox = document.createElement("div");
            elementObject.appendChild(subtitlesTrackRu);
            // elementObject.appendChild(subtitlesBox);
          }
        }

        erosionMachineContainer.appendChild(elementObject);

        event.el = elementObject;

        return event;
      };

      const addEvent = (type, element, toObject, position, duration) => {
        // console.log(position);
        // console.info(
        //   "🐛 ",
        //   type,
        //   "at:",
        //   String(position).replace("=+", "") + " seconds"
        // );
        try {
          timeline.to(
            element,
            0.01,
            {
              ...toObject,
              onStart: eventStart,
              onStartParams: [type, element, toObject, position, duration]
            },
            position
          );
        } catch (err) {
          console.error("💥 Adding event to timeline failed:", err);
        }
      };

      const eventStart = (type, element, toObject, position, duration) => {
        playedEvents.unshift({
          type: type,
          el: element,
          class: toObject.className ? toObject.className.slice(2) : false
        });

        if (type === "showVideo" || type === "showText") {
          setRandomPosition(element);
        }

        if (type === "showVideo") {
          if (lodash_get(element, "element.textTracks[0]", false))
            element.textTracks[0].oncuechange = function() {
              console.dir(this.activeCues[0].text);
            };
          playVideo(element);
        }

        window.setTimeout(() => {
          element.style.opacity = 0;
          element.nodeName.toLowerCase() == "video" ? element.pause() : null;
        }, duration);
      };

      const startTimer = delay => {
        window.setInterval(() => {
          if (counter == delay) {
            erosionMachineActive.set(true);

            timeline
              .getChildren()
              .map(c => c.target)
              .filter(
                el =>
                  el.style.position == "absolute" || el.style.position == "fixed"
              )
              .forEach(setRandomPosition);

            timeline
              .totalProgress(0)
              .timeScale(1)
              .play();
          }
          $$invalidate('counter', counter += 1);
        }, 1000);
      };

      const rewindTimeline = () => {
        console.info("⏪ Rewinding", playedEvents.length, "elements...");

        playedEvents.forEach(e => {
          if (e.type === "showVideo" || e.type === "showText") {
            TweenMax.to(e.el, 0.2, { opacity: 0 });
          } else if (e.type === "addClass") {
            TweenMax.to(e.el, 0.2, { css: { className: "-=" + e.class } });
          }
        });

        // Pause and rewind all videos
        timeline
          .getChildren()
          .filter(c => c.target.nodeName.toLowerCase() === "video")
          .forEach(c => {
            c.target.pause();
            c.target.currentTime = 0;
          });

        erosionMachineActive.set(false);
      };

      const handleMouseMove = () => {
        $$invalidate('counter', counter = 0);
        if (
          playedEvents.length > 0 &&
          (timeline.isActive() || timeline.totalProgress() === 1)
        ) {
          timeline.pause();
          rewindTimeline();
        }
      };

      const prepareClassEvent = (event, position, delay) => {
        const target = document.querySelector("#" + event.id);
        if (target) {
          addEvent(
            event.type,
            event.el,
            {
              className:
                event.type == "addClass" ? "+=" + event.class : "-=" + event.class
            },
            position,
            event.duration
          );
        } else {
          console.warn("🤔 Element not found: #" + event.id);
        }
      };

      const prepareShowEvent = (event, position) => {
        addEvent(event.type, event.el, { opacity: 1 }, position, event.duration);
      };

      const addLabel = position => {
        let label =
          "assemblage-" +
          Math.random()
            .toString(36)
            .substring(2, 15);

        timeline.addLabel(label, position);

        return label;
      };

      const playVideo = element => {
        let promise = element.play();
        if (promise !== undefined) {
          promise
            .then(_ => {
              console.log("🎥 Video started");
            })
            .catch(error => {
              console.error("💥 Error starting video:", error);
            });
        }
      };

      const getPosition = (index, arr, delay) => {
        if (index === 0) {
          return 0 + delay;
        }

        console.log(
          index,
          Math.round(
            arr
              .slice(0, index)
              .map(e => e.duration)
              .reduce((acc, curr) => acc + curr) + delay
          ) / 1000
        );

        return (
          Math.round(
            arr
              .slice(0, index)
              .map(e => e.duration)
              .reduce((acc, curr) => acc + curr) + delay
          ) / 1000
        );
      };

      const isClassEvent = event =>
        event.type === "addClass" || event.type === "removeClass";
      const isShowEvent = event =>
        event.type === "showText" || event.type === "showVideo";

      // *** ON MOUNT
      onMount(async () => {
        let response = {};
        let TIMELINE_JSON = {};

        try {
          response = await fetch(EEEFFF_JSON);
          TIMELINE_JSON = await response.json();
        } catch (err) {
          console.error(
            "💥 Fetch of timeline JSON from address " + EEEFFF_JSON + " failed",
            err
          );
        }

        // TIMELINE_JSON.config.disabled = true;

        if (lodash_get(TIMELINE_JSON, "config.disabled", true)) {
          console.warn("👻 Erosion machine disabled");
          return false;
        }

        if (!TIMELINE_JSON.timeline || TIMELINE_JSON.timeline.length === 0) {
          console.error("💥 No timeline events found");
          return false;
        }

        // TESTING
        // TIMELINE_JSON.config.delay = 2;

        console.info("🎰 Erosion machine initiated");
        console.info("––– Delay:", TIMELINE_JSON.config.delay);

        startTimer(TIMELINE_JSON.config.delay);

        TIMELINE_JSON.timeline
          .sort((a, b) => 0.5 - Math.random())
          .map(addElement)
          .forEach((event, i, arr) => {
            if (event.type === "assemblage") {
              let label = addLabel(
                getPosition(i, arr, event.delayed ? event.delayed : 0)
              );
              event.events.forEach(subEvent => {
                isClassEvent(subEvent)
                  ? prepareClassEvent(
                      subEvent,
                      getPosition(i, arr, subEvent.delayed ? subEvent.delayed : 0)
                    )
                  : null;
                isShowEvent(subEvent)
                  ? prepareShowEvent(
                      subEvent,
                      getPosition(i, arr, subEvent.delayed ? subEvent.delayed : 0)
                    )
                  : null;
              });
            } else {
              isClassEvent(event)
                ? prepareClassEvent(
                    event,
                    getPosition(
                      i,
                      arr,
                      getPosition(i, arr, event.delayed ? event.delayed : 0)
                    )
                  )
                : null;
              isShowEvent(event)
                ? prepareShowEvent(
                    event,
                    getPosition(
                      i,
                      arr,
                      getPosition(i, arr, event.delayed ? event.delayed : 0)
                    )
                  )
                : null;
            }
          });

        console.info("––– Total events:", timeline.getChildren().length);
      });

    	function section_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('erosionMachineContainer', erosionMachineContainer = $$value);
    		});
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('hidden' in $$props) $$invalidate('hidden', hidden = $$props.hidden);
    		if ('erosionMachineContainer' in $$props) $$invalidate('erosionMachineContainer', erosionMachineContainer = $$props.erosionMachineContainer);
    		if ('counter' in $$props) $$invalidate('counter', counter = $$props.counter);
    		if ('playedEvents' in $$props) playedEvents = $$props.playedEvents;
    		if ('timeline' in $$props) timeline = $$props.timeline;
    		if ('$activePage' in $$props) activePage.set($activePage);
    	};

    	$$self.$$.update = ($$dirty = { counter: 1, $activePage: 1 }) => {
    		if ($$dirty.counter) { {
            erosionMachineCounter.set(counter);
          } }
    		if ($$dirty.$activePage) { {
            $$invalidate('hidden', hidden = $activePage === "alina" ? true : false);
          } }
    	};

    	return {
    		hidden,
    		erosionMachineContainer,
    		handleMouseMove,
    		section_binding
    	};
    }

    class ErosionMachine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ErosionMachine", options, id: create_fragment$3.name });
    	}
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function quartOut(t) {
        return Math.pow(t - 1.0, 3.0) * (1.0 - t) + 1.0;
    }

    function blur(node, { delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const f = style.filter === 'none' ? '' : style.filter;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `opacity: ${target_opacity - (od * u)}; filter: ${f} blur(${u * amount}px);`
        };
    }
    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/Menu.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/Menu.svelte";

    // (182:6) {#if active}
    function create_if_block$1(ctx) {
    	var div0, div0_intro, div0_outro, t0, div1, t1, span, div1_intro, div1_outro, t3, div2, div2_intro, div2_outro, t4, div3, div3_intro, div3_outro, current;

    	var link0 = new Link({
    		props: {
    		to: "publication",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link1 = new Link({
    		props: {
    		to: "alina-chaiderov",
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link2 = new Link({
    		props: {
    		to: "eeefff",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link3 = new Link({
    		props: {
    		to: "olof-marsja",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			link0.$$.fragment.c();
    			t0 = space();
    			div1 = element("div");
    			link1.$$.fragment.c();
    			t1 = space();
    			span = element("span");
    			span.textContent = "TXT";
    			t3 = space();
    			div2 = element("div");
    			link2.$$.fragment.c();
    			t4 = space();
    			div3 = element("div");
    			link3.$$.fragment.c();
    			attr_dev(div0, "class", "item svelte-1w29ek1");
    			add_location(div0, file$2, 182, 8, 4465);
    			attr_dev(span, "class", "txt-link svelte-1w29ek1");
    			add_location(span, file$2, 199, 10, 5145);
    			attr_dev(div1, "class", "item svelte-1w29ek1");
    			add_location(div1, file$2, 191, 8, 4809);
    			attr_dev(div2, "class", "item svelte-1w29ek1");
    			add_location(div2, file$2, 202, 8, 5203);
    			attr_dev(div3, "class", "item svelte-1w29ek1");
    			add_location(div3, file$2, 211, 8, 5527);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(link0, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(link1, div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, span);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);
    			mount_component(link2, div2, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div3, anchor);
    			mount_component(link3, div3, null);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);

    			add_render_callback(() => {
    				if (div0_outro) div0_outro.end(1);
    				if (!div0_intro) div0_intro = create_in_transition(div0, fly, { duration: 400, y: 20, delay: 0, easing: quartOut });
    				div0_intro.start();
    			});

    			transition_in(link1.$$.fragment, local);

    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, fly, { duration: 400, y: 20, delay: 100, easing: quartOut });
    				div1_intro.start();
    			});

    			transition_in(link2.$$.fragment, local);

    			add_render_callback(() => {
    				if (div2_outro) div2_outro.end(1);
    				if (!div2_intro) div2_intro = create_in_transition(div2, fly, { duration: 400, y: 20, delay: 200, easing: quartOut });
    				div2_intro.start();
    			});

    			transition_in(link3.$$.fragment, local);

    			add_render_callback(() => {
    				if (div3_outro) div3_outro.end(1);
    				if (!div3_intro) div3_intro = create_in_transition(div3, fly, { duration: 400, y: 20, delay: 300, easing: quartOut });
    				div3_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			if (div0_intro) div0_intro.invalidate();

    			div0_outro = create_out_transition(div0, fly, { duration: 300, y: 60, delay: 300 });

    			transition_out(link1.$$.fragment, local);
    			if (div1_intro) div1_intro.invalidate();

    			div1_outro = create_out_transition(div1, fly, { duration: 300, y: 60, delay: 0 });

    			transition_out(link2.$$.fragment, local);
    			if (div2_intro) div2_intro.invalidate();

    			div2_outro = create_out_transition(div2, fly, { duration: 300, y: 60, delay: 200 });

    			transition_out(link3.$$.fragment, local);
    			if (div3_intro) div3_intro.invalidate();

    			div3_outro = create_out_transition(div3, fly, { duration: 300, y: 60, delay: 100 });

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    			}

    			destroy_component(link0);

    			if (detaching) {
    				if (div0_outro) div0_outro.end();
    				detach_dev(t0);
    				detach_dev(div1);
    			}

    			destroy_component(link1);

    			if (detaching) {
    				if (div1_outro) div1_outro.end();
    				detach_dev(t3);
    				detach_dev(div2);
    			}

    			destroy_component(link2);

    			if (detaching) {
    				if (div2_outro) div2_outro.end();
    				detach_dev(t4);
    				detach_dev(div3);
    			}

    			destroy_component(link3);

    			if (detaching) {
    				if (div3_outro) div3_outro.end();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(182:6) {#if active}", ctx });
    	return block;
    }

    // (187:10) <Link to="publication">
    function create_default_slot_4(ctx) {
    	var span0, t_1, span1;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			span0.textContent = "LIQUID FICTION";
    			t_1 = space();
    			span1 = element("span");
    			span1.textContent = "~~~~~~_~~~~~~~~";
    			attr_dev(span0, "class", "line-1 svelte-1w29ek1");
    			add_location(span0, file$2, 187, 12, 4669);
    			attr_dev(span1, "class", "line-2 svelte-1w29ek1");
    			add_location(span1, file$2, 188, 12, 4724);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			insert_dev(target, t_1, anchor);
    			insert_dev(target, span1, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span0);
    				detach_dev(t_1);
    				detach_dev(span1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_4.name, type: "slot", source: "(187:10) <Link to=\"publication\">", ctx });
    	return block;
    }

    // (196:10) <Link to="alina-chaiderov">
    function create_default_slot_3(ctx) {
    	var span0, t_1, span1;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			span0.textContent = "Alina Chaiderov";
    			t_1 = space();
    			span1 = element("span");
    			span1.textContent = "~~~~~_~~~~~~~~~";
    			attr_dev(span0, "class", "line-1 svelte-1w29ek1");
    			add_location(span0, file$2, 196, 12, 5017);
    			attr_dev(span1, "class", "line-2 svelte-1w29ek1");
    			add_location(span1, file$2, 197, 12, 5073);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			insert_dev(target, t_1, anchor);
    			insert_dev(target, span1, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span0);
    				detach_dev(t_1);
    				detach_dev(span1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3.name, type: "slot", source: "(196:10) <Link to=\"alina-chaiderov\">", ctx });
    	return block;
    }

    // (207:10) <Link to="eeefff">
    function create_default_slot_2(ctx) {
    	var span0, t_1, span1;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			span0.textContent = "eeefff";
    			t_1 = space();
    			span1 = element("span");
    			span1.textContent = "~~~~~~";
    			attr_dev(span0, "class", "line-1 svelte-1w29ek1");
    			add_location(span0, file$2, 207, 12, 5404);
    			attr_dev(span1, "class", "line-2 svelte-1w29ek1");
    			add_location(span1, file$2, 208, 12, 5451);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			insert_dev(target, t_1, anchor);
    			insert_dev(target, span1, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span0);
    				detach_dev(t_1);
    				detach_dev(span1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(207:10) <Link to=\"eeefff\">", ctx });
    	return block;
    }

    // (216:10) <Link to="olof-marsja">
    function create_default_slot_1(ctx) {
    	var span0, t_1, span1;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			span0.textContent = "Olof Marsja";
    			t_1 = space();
    			span1 = element("span");
    			span1.textContent = "~~~~_~~~~~~";
    			attr_dev(span0, "class", "line-1 svelte-1w29ek1");
    			add_location(span0, file$2, 216, 12, 5733);
    			attr_dev(span1, "class", "line-2 svelte-1w29ek1");
    			add_location(span1, file$2, 217, 12, 5785);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			insert_dev(target, t_1, anchor);
    			insert_dev(target, span1, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span0);
    				detach_dev(t_1);
    				detach_dev(span1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(216:10) <Link to=\"olof-marsja\">", ctx });
    	return block;
    }

    // (180:2) <Router>
    function create_default_slot(ctx) {
    	var div, current;

    	var if_block = (ctx.active) && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "inner");
    			add_location(div, file$2, 180, 4, 4418);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.active) {
    				if (!if_block) {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				} else transition_in(if_block, 1);
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(180:2) <Router>", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var div2, t, div1, div0, svg, defs, clipPath, rect, title, t_1, g, path, current, dispose;

    	var router = new Router({
    		props: {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			router.$$.fragment.c();
    			t = space();
    			div1 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			clipPath = svg_element("clipPath");
    			rect = svg_element("rect");
    			title = svg_element("title");
    			t_1 = text("cross");
    			g = svg_element("g");
    			path = svg_element("path");
    			attr_dev(rect, "class", "cls-1 svelte-1w29ek1");
    			attr_dev(rect, "x", "1.08");
    			attr_dev(rect, "y", "0.65");
    			attr_dev(rect, "width", "55.46");
    			attr_dev(rect, "height", "55.39");
    			add_location(rect, file$2, 232, 12, 6180);
    			attr_dev(clipPath, "id", "clip-path");
    			attr_dev(clipPath, "transform", "translate(-1.08 -0.65)");
    			add_location(clipPath, file$2, 231, 10, 6107);
    			add_location(defs, file$2, 230, 8, 6090);
    			add_location(title, file$2, 240, 8, 6366);
    			attr_dev(path, "class", "cls-3 svelte-1w29ek1");
    			attr_dev(path, "d", "M2.12,49a3.91,3.91,0,0,0-1,2.4,3.08,3.08,0,0,0,1,2.41l1.23,1.23A3.37,3.37,0,0,0,5.69,56a3.12,3.12,0,0,0,2.47-.89L27.38,35.59a1.55,1.55,0,0,1,2.47,0L49.34,54.94A3,3,0,0,0,51.67,56a3.37,3.37,0,0,0,2.47-1.1l1.38-1.23a2.88,2.88,0,0,0,1-2.4,3.62,3.62,0,0,0-1-2.41L36,29.41a1.55,1.55,0,0,1,0-2.47L55.52,7.72a3.18,3.18,0,0,0,.89-2.47,3.45,3.45,0,0,0-.89-2.33L54.28,1.68a3.2,3.2,0,0,0-2.47-1,3.44,3.44,0,0,0-2.33,1L30,20.9a1.4,1.4,0,0,1-2.33,0L8.16,1.68a2.84,2.84,0,0,0-2.27-1,3.51,3.51,0,0,0-2.54,1.1L2.12,2.92a3.21,3.21,0,0,0-1,2.54,3.48,3.48,0,0,0,1,2.4L21.34,27.22a1.66,1.66,0,0,1,0,2.47Z");
    			attr_dev(path, "transform", "translate(-1.08 -0.65)");
    			add_location(path, file$2, 242, 10, 6423);
    			attr_dev(g, "class", "cls-2 svelte-1w29ek1");
    			add_location(g, file$2, 241, 8, 6395);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "viewBox", "0 0 55.46 55.39");
    			attr_dev(svg, "class", "svelte-1w29ek1");
    			add_location(svg, file$2, 226, 6, 5948);
    			attr_dev(div0, "class", "inner-1");
    			add_location(div0, file$2, 225, 4, 5920);
    			attr_dev(div1, "class", "close svelte-1w29ek1");
    			add_location(div1, file$2, 224, 2, 5896);
    			attr_dev(div2, "class", "menu svelte-1w29ek1");
    			toggle_class(div2, "active", ctx.active);
    			add_location(div2, file$2, 172, 0, 4318);
    			dispose = listen_dev(div2, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			mount_component(router, div2, null);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, svg);
    			append_dev(svg, defs);
    			append_dev(defs, clipPath);
    			append_dev(clipPath, rect);
    			append_dev(svg, title);
    			append_dev(title, t_1);
    			append_dev(svg, g);
    			append_dev(g, path);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.$$scope || changed.active) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);

    			if (changed.active) {
    				toggle_class(div2, "active", ctx.active);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			destroy_component(router);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	

      // const handleExit = () => {
      //   exit = true;
      //   setTimeout(() => {
      //     exit = false;
      //   }, 1000);
      // };

      // *** VARIABLES
      let { active = false } = $$props;
      const dispatch = createEventDispatcher();
      // export let exit = false;

    	const writable_props = ['active'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    	    dispatch('close');
    	  };

    	$$self.$set = $$props => {
    		if ('active' in $$props) $$invalidate('active', active = $$props.active);
    	};

    	$$self.$capture_state = () => {
    		return { active };
    	};

    	$$self.$inject_state = $$props => {
    		if ('active' in $$props) $$invalidate('active', active = $$props.active);
    	};

    	$$self.$$.update = ($$dirty = { active: 1 }) => {
    		if ($$dirty.active) { {
            menuActive.set(active);
          } }
    	};

    	return { active, dispatch, click_handler };
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, ["active"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Menu", options, id: create_fragment$4.name });
    	}

    	get active() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Orb.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/Orb.svelte";

    function create_fragment$5(ctx) {
    	var div5, div2, div0, t1, div1, t3, div4, div3, t4, current, dispose;

    	var menu = new Menu({
    		props: { active: ctx.menuActive },
    		$$inline: true
    	});
    	menu.$on("close", ctx.close_handler);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "LIQUID~";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "FICTION";
    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");
    			t4 = space();
    			menu.$$.fragment.c();
    			attr_dev(div0, "class", "inner-1 svelte-hkkoor");
    			add_location(div0, file$3, 148, 4, 3417);
    			attr_dev(div1, "class", "inner-2 svelte-hkkoor");
    			add_location(div1, file$3, 149, 4, 3480);
    			attr_dev(div2, "class", "nav-text svelte-hkkoor");
    			toggle_class(div2, "scrolling", scrolling);
    			add_location(div2, file$3, 147, 2, 3374);
    			attr_dev(div3, "class", "spinner-half svelte-hkkoor");
    			add_location(div3, file$3, 152, 4, 3605);
    			attr_dev(div4, "id", "spinner");
    			attr_dev(div4, "class", "spinner svelte-hkkoor");
    			toggle_class(div4, "scrolling", scrolling);
    			add_location(div4, file$3, 151, 2, 3550);
    			attr_dev(div5, "class", "orb svelte-hkkoor");
    			toggle_class(div5, "inactive", ctx.menuActive);
    			add_location(div5, file$3, 140, 0, 3243);

    			dispose = [
    				listen_dev(window, "scroll", ctx.handleScroll),
    				listen_dev(div5, "click", ctx.click_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div2);
    			append_dev(div2, div0);
    			ctx.div0_binding(div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			ctx.div1_binding(div1);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			ctx.div5_binding(div5);
    			insert_dev(target, t4, anchor);
    			mount_component(menu, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.scrolling) {
    				toggle_class(div2, "scrolling", scrolling);
    				toggle_class(div4, "scrolling", scrolling);
    			}

    			if (changed.menuActive) {
    				toggle_class(div5, "inactive", ctx.menuActive);
    			}

    			var menu_changes = {};
    			if (changed.menuActive) menu_changes.active = ctx.menuActive;
    			menu.$set(menu_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div5);
    			}

    			ctx.div0_binding(null);
    			ctx.div1_binding(null);
    			ctx.div5_binding(null);

    			if (detaching) {
    				detach_dev(t4);
    			}

    			destroy_component(menu, detaching);

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    let y = 0;

    let scrolling = false;

    let menuExit = false;

    function instance$5($$self, $$props, $$invalidate) {
    	let $orbBackgroundOne, $orbColorOne, $orbBackgroundTwo, $orbColorTwo;

    	validate_store(orbBackgroundOne, 'orbBackgroundOne');
    	component_subscribe($$self, orbBackgroundOne, $$value => { $orbBackgroundOne = $$value; $$invalidate('$orbBackgroundOne', $orbBackgroundOne); });
    	validate_store(orbColorOne, 'orbColorOne');
    	component_subscribe($$self, orbColorOne, $$value => { $orbColorOne = $$value; $$invalidate('$orbColorOne', $orbColorOne); });
    	validate_store(orbBackgroundTwo, 'orbBackgroundTwo');
    	component_subscribe($$self, orbBackgroundTwo, $$value => { $orbBackgroundTwo = $$value; $$invalidate('$orbBackgroundTwo', $orbBackgroundTwo); });
    	validate_store(orbColorTwo, 'orbColorTwo');
    	component_subscribe($$self, orbColorTwo, $$value => { $orbColorTwo = $$value; $$invalidate('$orbColorTwo', $orbColorTwo); });

    	

      let orbObject = {};
      let orbInnerOne = {};
      let orbInnerTwo = {};

      const handleScroll = e => {
        console.log("XXXXX");
        console.log(e);
      };
      let menuActive = false;

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('orbInnerOne', orbInnerOne = $$value);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('orbInnerTwo', orbInnerTwo = $$value);
    		});
    	}

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('orbObject', orbObject = $$value);
    		});
    	}

    	const click_handler = () => {
    	    $$invalidate('menuActive', menuActive = !menuActive);
    	  };

    	const close_handler = () => {
    	    $$invalidate('menuActive', menuActive = false);
    	  };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('orbObject' in $$props) $$invalidate('orbObject', orbObject = $$props.orbObject);
    		if ('orbInnerOne' in $$props) $$invalidate('orbInnerOne', orbInnerOne = $$props.orbInnerOne);
    		if ('orbInnerTwo' in $$props) $$invalidate('orbInnerTwo', orbInnerTwo = $$props.orbInnerTwo);
    		if ('y' in $$props) y = $$props.y;
    		if ('scrolling' in $$props) $$invalidate('scrolling', scrolling = $$props.scrolling);
    		if ('menuActive' in $$props) $$invalidate('menuActive', menuActive = $$props.menuActive);
    		if ('menuExit' in $$props) menuExit = $$props.menuExit;
    		if ('$orbBackgroundOne' in $$props) orbBackgroundOne.set($orbBackgroundOne);
    		if ('$orbColorOne' in $$props) orbColorOne.set($orbColorOne);
    		if ('$orbBackgroundTwo' in $$props) orbBackgroundTwo.set($orbBackgroundTwo);
    		if ('$orbColorTwo' in $$props) orbColorTwo.set($orbColorTwo);
    	};

    	$$self.$$.update = ($$dirty = { orbInnerOne: 1, $orbBackgroundOne: 1, $orbColorOne: 1, orbInnerTwo: 1, $orbBackgroundTwo: 1, $orbColorTwo: 1 }) => {
    		if ($$dirty.orbInnerOne || $$dirty.$orbBackgroundOne || $$dirty.$orbColorOne || $$dirty.orbInnerTwo || $$dirty.$orbBackgroundTwo || $$dirty.$orbColorTwo) { {
            TweenMax.to(orbInnerOne, 0.01, {
              css: { background: $orbBackgroundOne, color: $orbColorOne }
            });
            TweenMax.to(orbInnerTwo, 0.01, {
              css: { background: $orbBackgroundTwo, color: $orbColorTwo }
            });
          } }
    	};

    	return {
    		orbObject,
    		orbInnerOne,
    		orbInnerTwo,
    		handleScroll,
    		menuActive,
    		div0_binding,
    		div1_binding,
    		div5_binding,
    		click_handler,
    		close_handler
    	};
    }

    class Orb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Orb", options, id: create_fragment$5.name });
    	}
    }

    /* src/Publication.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/Publication.svelte";

    function create_fragment$6(ctx) {
    	var div1, div0, p0, strong, t1, p1, t3, p2, t5, p3, t7, p4, div0_intro;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			strong = element("strong");
    			strong.textContent = "LIQUID FICTION";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "A digital residency programme that explores logistic reversals of\n      contemporary fluidity as methods for ethical, autonomous liveness in the\n      arts today. Initiated by Frida Sandström, run by The Nordic\n      Watercolour Museum in the archipelago of south-west Sweden. Whilst\n      the museum departs from the legacy of watercolors and the use of waters in\n      arts, Liquid Fiction investigates liquidity as a central concept for\n      historical and contemporary logistical systems of communication within\n      which the arts reside.";
    			t3 = space();
    			p2 = element("p");
    			p2.textContent = "The current version of Liquid Fiction unfolds over two cycles: the first\n      from May 2019 to September 2019, the second from October 2019 to February\n      2020. At the end of each residency, an ongoing artistic practice,\n      developed in a curatorial dialogue with the platform, is made public along\n      with reflective essays and expanding research conducted by Frida\n      Sandström and invited writer Gaby Cepeda. Artists-in-residence during\n      the first cycle are eeefff (RU), Alina Chaiderov (RU/SV), Olof Marsja\n      (SE). Confirmed artists for the second cycle are Anna Rúin\n      Tryggvadottir (IS), Heba Y. Amin (EG), Stine Janvin (NO) and Hanni Kamaly\n      (NO).";
    			t5 = text("\n    ********\n    ");
    			p3 = element("p");
    			p3.textContent = "Online, the frameworks of artistic actions are intertwined with the very\n      infrastructure of their distribution, if the distribution itself is not in\n      fact their main medium. Emerging as infrastructure, an online presence\n      overturns the distributive logics that have shaped today’s concept\n      of the artwork as such.";
    			t7 = space();
    			p4 = element("p");
    			p4.textContent = "Today, the emergence of life is restrained and the logistical\n      infrastructure of the arts is eroding. The state demands what Stefano\n      Harney calls a ‘reversed logistics’, that is, to not perform\n      an assumed position within a logistical system that one is part of. By\n      reversing this system, one resists being fully consumed by it. This is\n      what Liquid Fiction intends to do: exploring logistic reversals of the\n      fluid as methods for ethical, autonomous liveness in the arts today. How\n      are fluid interfaces occupied?";
    			add_location(strong, file$4, 134, 6, 2941);
    			attr_dev(p0, "class", "svelte-shc4h9");
    			add_location(p0, file$4, 133, 4, 2931);
    			attr_dev(p1, "class", "svelte-shc4h9");
    			add_location(p1, file$4, 136, 4, 2986);
    			attr_dev(p2, "class", "svelte-shc4h9");
    			add_location(p2, file$4, 146, 4, 3565);
    			attr_dev(p3, "class", "svelte-shc4h9");
    			add_location(p3, file$4, 159, 4, 4297);
    			attr_dev(p4, "class", "svelte-shc4h9");
    			add_location(p4, file$4, 166, 4, 4661);
    			add_location(div0, file$4, 132, 2, 2913);
    			attr_dev(div1, "class", "about svelte-shc4h9");
    			add_location(div1, file$4, 127, 0, 2785);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, strong);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(div0, t3);
    			append_dev(div0, p2);
    			append_dev(div0, t5);
    			append_dev(div0, p3);
    			append_dev(div0, t7);
    			append_dev(div0, p4);
    		},

    		p: noop,

    		i: function intro(local) {
    			if (!div0_intro) {
    				add_render_callback(() => {
    					div0_intro = create_in_transition(div0, blur, {});
    					div0_intro.start();
    				});
    			}
    		},

    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self) {
    	

      activePage.set("about");
      orbBackgroundOne.set("rgb(255, 140, 0)");
      orbBackgroundTwo.set("rgb(118, 165, 32)");

      orbColorOne.set("rgba(255,255,255,1)");
      orbColorTwo.set("rgba(0,0,0,1)");

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return {};
    }

    class Publication extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Publication", options, id: create_fragment$6.name });
    	}
    }

    /* src/eeefff/EEEFFF.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/eeefff/EEEFFF.svelte";

    // (55:2) {#if !$erosionMachineActive}
    function create_if_block$2(ctx) {
    	var div, span, t, span_style_value, div_intro;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(ctx.$erosionMachineCounter);
    			attr_dev(span, "style", span_style_value = ctx.$erosionMachineCounter === 0 ? 'color:red' : '');
    			attr_dev(span, "class", "svelte-dh9d9y");
    			add_location(span, file$5, 57, 6, 1192);
    			add_location(div, file$5, 55, 4, 1089);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t);
    		},

    		p: function update(changed, ctx) {
    			if (changed.$erosionMachineCounter) {
    				set_data_dev(t, ctx.$erosionMachineCounter);
    			}

    			if ((changed.$erosionMachineCounter) && span_style_value !== (span_style_value = ctx.$erosionMachineCounter === 0 ? 'color:red' : '')) {
    				attr_dev(span, "style", span_style_value);
    			}
    		},

    		i: function intro(local) {
    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fade, {});
    					div_intro.start();
    				});
    			}
    		},

    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(55:2) {#if !$erosionMachineActive}", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var t, div;

    	var if_block = (!ctx.$erosionMachineActive) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			t = space();
    			div = element("div");
    			if (if_block) if_block.c();
    			document.title = "EEEFFF | LIQUID FICTION";
    			attr_dev(div, "class", "eeefff svelte-dh9d9y");
    			add_location(div, file$5, 53, 0, 1033);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (!ctx.$erosionMachineActive) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			transition_in(if_block);
    		},

    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    				detach_dev(div);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $erosionMachineActive, $erosionMachineCounter;

    	validate_store(erosionMachineActive, 'erosionMachineActive');
    	component_subscribe($$self, erosionMachineActive, $$value => { $erosionMachineActive = $$value; $$invalidate('$erosionMachineActive', $erosionMachineActive); });
    	validate_store(erosionMachineCounter, 'erosionMachineCounter');
    	component_subscribe($$self, erosionMachineCounter, $$value => { $erosionMachineCounter = $$value; $$invalidate('$erosionMachineCounter', $erosionMachineCounter); });

    	

      // *** PROPS
      let { location } = $$props;

      activePage.set("eeefff");
      orbBackgroundOne.set("rgba(0,0,255,1)");
      orbBackgroundTwo.set("rgba(0,0,255,1)");

    	const writable_props = ['location'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<EEEFFF> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    	};

    	$$self.$capture_state = () => {
    		return { location, $erosionMachineActive, $erosionMachineCounter };
    	};

    	$$self.$inject_state = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('$erosionMachineActive' in $$props) erosionMachineActive.set($erosionMachineActive);
    		if ('$erosionMachineCounter' in $$props) erosionMachineCounter.set($erosionMachineCounter);
    	};

    	return {
    		location,
    		$erosionMachineActive,
    		$erosionMachineCounter
    	};
    }

    class EEEFFF extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, ["location"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "EEEFFF", options, id: create_fragment$7.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.location === undefined && !('location' in props)) {
    			console.warn("<EEEFFF> was created without expected prop 'location'");
    		}
    	}

    	get location() {
    		throw new Error("<EEEFFF>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<EEEFFF>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var viewerApi = createCommonjsModule(function (module, exports) {
    !function(t,e){module.exports=e();}(window,function(){return function(t){var e={};function i(n){if(e[n])return e[n].exports;var s=e[n]={i:n,l:!1,exports:{}};return t[n].call(s.exports,s,s.exports,i),s.l=!0,s.exports}return i.m=t,i.c=e,i.d=function(t,e,n){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n});},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(i.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var s in t)i.d(n,s,function(e){return t[e]}.bind(null,s));return n},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="/static/builds/web/dist/",i(i.s=1)}([function(t,e){function i(t){return (i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function n(e){return "function"==typeof Symbol&&"symbol"===i(Symbol.iterator)?t.exports=n=function(t){return i(t)}:t.exports=n=function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":i(t)},n(e)}t.exports=n;},function(t,e,i){i.r(e);var n=i(0),s=i.n(n),r=function(t,e,i){this._target=t,this._requestIdCounter=0,this._pendingRequests={},this._eventListeners={},this._ready=!1,this._domain=i,this._instanceId=e,this.listenServer();};r.prototype={getIdentifier:function(){return this._instanceId},getDomain:function(){return this._domain},setIdentifier:function(t){this._instanceId=t;},use:function(t,e){this._version=t,this._ready=!0;var i=this._requestIdCounter++;this._pendingRequests[i]=function(t,i,n){t?e.call(this,t):e.call(this,null,new function(t,e){t.forEach(function(t){this[t]=function(){var i,n=e._requestIdCounter++,s=Array.prototype.slice.call(arguments);s.length>0&&"function"==typeof s[s.length-1]&&(i=s.pop()),i&&(e._pendingRequests[n]=i.bind(this)),e._target.postMessage({type:"api.request",instanceId:e.getIdentifier(),requestId:n,member:t,arguments:s},e.getDomain());};},this),this.addEventListener=function(t,i,n){"viewerready"===t&&e.isViewerReady&&i(),e._eventListeners[t]||(e._eventListeners[t]=[]),e._eventListeners[t].push(i),n&&this.setListenerOptions&&(n.name=t,this.setListenerOptions(n));},this.removeEventListener=function(t,i){if(e._eventListeners[t]){var n=e._eventListeners[t].indexOf(i);-1!==n&&e._eventListeners[t].splice(n,1);}};}(n,this));}.bind(this),this._target.postMessage({type:"api.initialize",requestId:i,name:t,instanceId:this._instanceId},this._domain);},listenServer:function(){var t=["api.initialize.result","api.request.result","api.event"];window.addEventListener("message",function(e){if(e.origin===this._domain&&e.data&&e.data.type&&e.data.instanceId&&e.data.instanceId===this.getIdentifier()){var i=e.data.type;if(-1!==t.indexOf(i))if("api.event"===i){var n=e.data.results,s=n[0];if(this._eventListeners["*"]||this._eventListeners.all)return void["*","all"].forEach(function(t){var e=this._eventListeners[t];e&&e.forEach(function(t){t.apply(t,n);});},this);var r=n.slice(1),o=this._eventListeners[s];o?o.forEach(function(t){t.apply(t,r);}):"viewerready"===s&&(this.isViewerReady=!0);}else{var a=this._pendingRequests[e.data.requestId];if(!a)return;a.apply(null,e.data.results);}}}.bind(this));}};var o=r;function a(t){var e={};return Object.keys(t).forEach(function(i){e[i]=Array.isArray(t[i])?t[i]:[t[i]];}),e}function u(t){return "object"===s()(t)?a(t):("?"===t[0]&&(t=t.substr(1)),t.split(/&+/g).reduce(function(t,e){if(0===e.length)return t;var i=e.indexOf("=");-1===i&&(i=e.length);var n=decodeURIComponent(e.substr(0,i).replace(/\+/g,"%20")),s=decodeURIComponent(e.substr(i+1).replace(/\+/g,"%20"));return void 0===t[n]&&(t[n]=[]),t[n].push(s),t},{}))}window.SketchfabAPIClient=o;var d=function(t,e){var i=t,n=e;"object"===s()(t)&&(n=t,i=null),this._version=i,this._target=n,window.sketchfabAPIinstances||(window.sketchfabAPIinstances=[]),window.sketchfabAPIinstances.push(this),this._apiId=window.sketchfabAPIinstances.length.toString(),this._target.id&&(this._apiId+="_"+this._target.id),this._target.allow||(this._target.allow="vr; autoplay; fullscreen"),this._client=void 0,this._options=void 0,this._domain="sketchfab.com",this._domain="same-as-current"===this._domain?window.location.hostname:this._domain,this._urlTemplate="https://YYYY/models/XXXX/embed",this._url=this._urlTemplate.replace("YYYY",this._domain),this._transmitOptions={},this._getURLOptions();};d.prototype={_urlOptionsDict:{skfb_api_version:{default:"1.5.1",type:"string"}},_optionsLoaded:function(t){this._urlOptions=t,this._version=this._getURLOption("skfb_api_version",this._version);},_getURLOption:function(t,e){var i=this._urlOptionsDict[t];if(!i)return e;void 0!==e&&null!==e||(e=i.default);var n=this._urlOptions[t];return n&&n.length?n[0]:e},_getURLOptions:function(){if(!window||!window.location.search)return this._optionsLoaded({});var t=u(window.location.search);for(var e in t)e.startsWith("skfb_")&&(this._transmitOptions[e.substr(5)]=t[e]);return this._optionsLoaded(t)},getEmbedURL:function(t,e){var i=this._url+"?api_version="+this._version+"&api_id="+this._apiId;e&&Object.keys(e).forEach(function(t){null!=e[t]&&"function"!=typeof e[t]&&(i+="&"+t.toString()+"="+e[t].toString());});var n=this._transmitOptions;return Object.keys(this._transmitOptions).forEach(function(t){i+="&"+t.toString()+"="+n[t].toString();}),i.replace("XXXX",t)},init:function(t,e){this._options=e,this._uid=t,this._realInit();},reload:function(t){var e=document.createElement("script");e.setAttribute("src","https://static."+t+"/api/sketchfab-viewer-"+this._version+".js"),e.addEventListener("load",function(){this._url=this._urlTemplate.replace("YYYY",t),-1!==this._domain.indexOf("sketchfab.com")&&(this._transmitOptions.hook_prod=1,this._transmitOptions.model=this._uid),this._realInit();}.bind(this)),document.body.appendChild(e);},_initializeAPIEmbed:function(t){if(t.data&&t.data.instanceId&&this._apiId===t.data.instanceId&&"api.ready"===t.data.type){var e=t.data.options;if(e&&e.domain)this.reload(e.domain);else if(void 0===t.data.error){var i=this._target.src.split("/");i="https://"+i[2],this._client=new window.SketchfabAPIClient(this._target.contentWindow,this._apiId,i),this._client.use(this._version,function(t,e){if(t)throw t;this.success.call(this,e);}.bind(this)),window.removeEventListener("message",this._claimEmbedBinded);}else this.error(t.data.error);}},_realInit:function(){this._initializeAPIEmbedBinded=this._initializeAPIEmbed.bind(this),window.addEventListener("message",this._initializeAPIEmbedBinded),this._target.onload=function(t){try{var e=t.currentTarget.contentDocument.title;(e.startsWith("Page not found")||e.startsWith("400 - "))&&this.error.call(this,"Model not found "+this._uid);}catch(t){}}.bind(this),this._target.src=this.getEmbedURL(this._uid,this._options);},success:function(t){this._options.success&&"function"==typeof this._options.success&&this._options.success(t);},error:function(t){this._options.error&&"function"==typeof this._options.error&&this._options.error(t);}};e.default=d;}]).default});
    //# sourceMappingURL=sketchfab-viewer-1.5.1.js.map
    });

    var Sketchfab = unwrapExports(viewerApi);
    var viewerApi_1 = viewerApi.Sketchfab;

    // Object.keys
    if (!Object.keys) {
      Object.keys = function(object) {
        var keys = [];
        for (var name in object) {
          if (Object.prototype.hasOwnProperty.call(object, name)) {
            keys.push(name);
          }
        }
        return keys;
      };
    }

    // ChildNode.remove
    if(!("remove" in Element.prototype)){
      Element.prototype.remove = function(){
        if(this.parentNode) {
          this.parentNode.removeChild(this);
        }
      };
    }

    var win = window;

    var raf$1 = win.requestAnimationFrame
      || win.webkitRequestAnimationFrame
      || win.mozRequestAnimationFrame
      || win.msRequestAnimationFrame
      || function(cb) { return setTimeout(cb, 16); };

    var win$1 = window;

    var caf = win$1.cancelAnimationFrame
      || win$1.mozCancelAnimationFrame
      || function(id){ clearTimeout(id); };

    function extend() {
      var obj, name, copy,
          target = arguments[0] || {},
          i = 1,
          length = arguments.length;

      for (; i < length; i++) {
        if ((obj = arguments[i]) !== null) {
          for (name in obj) {
            copy = obj[name];

            if (target === copy) {
              continue;
            } else if (copy !== undefined) {
              target[name] = copy;
            }
          }
        }
      }
      return target;
    }

    function checkStorageValue (value) {
      return ['true', 'false'].indexOf(value) >= 0 ? JSON.parse(value) : value;
    }

    function setLocalStorage(storage, key, value, access) {
      if (access) {
        try { storage.setItem(key, value); } catch (e) {}
      }
      return value;
    }

    function getSlideId() {
      var id = window.tnsId;
      window.tnsId = !id ? 1 : id + 1;
      
      return 'tns' + window.tnsId;
    }

    function getBody () {
      var doc = document,
          body = doc.body;

      if (!body) {
        body = doc.createElement('body');
        body.fake = true;
      }

      return body;
    }

    var docElement = document.documentElement;

    function setFakeBody (body) {
      var docOverflow = '';
      if (body.fake) {
        docOverflow = docElement.style.overflow;
        //avoid crashing IE8, if background image is used
        body.style.background = '';
        //Safari 5.13/5.1.4 OSX stops loading if ::-webkit-scrollbar is used and scrollbars are visible
        body.style.overflow = docElement.style.overflow = 'hidden';
        docElement.appendChild(body);
      }

      return docOverflow;
    }

    function resetFakeBody (body, docOverflow) {
      if (body.fake) {
        body.remove();
        docElement.style.overflow = docOverflow;
        // Trigger layout so kinetic scrolling isn't disabled in iOS6+
        // eslint-disable-next-line
        docElement.offsetHeight;
      }
    }

    // get css-calc 

    function calc() {
      var doc = document, 
          body = getBody(),
          docOverflow = setFakeBody(body),
          div = doc.createElement('div'), 
          result = false;

      body.appendChild(div);
      try {
        var str = '(10px * 10)',
            vals = ['calc' + str, '-moz-calc' + str, '-webkit-calc' + str],
            val;
        for (var i = 0; i < 3; i++) {
          val = vals[i];
          div.style.width = val;
          if (div.offsetWidth === 100) { 
            result = val.replace(str, ''); 
            break;
          }
        }
      } catch (e) {}
      
      body.fake ? resetFakeBody(body, docOverflow) : div.remove();

      return result;
    }

    // get subpixel support value

    function percentageLayout() {
      // check subpixel layout supporting
      var doc = document,
          body = getBody(),
          docOverflow = setFakeBody(body),
          wrapper = doc.createElement('div'),
          outer = doc.createElement('div'),
          str = '',
          count = 70,
          perPage = 3,
          supported = false;

      wrapper.className = "tns-t-subp2";
      outer.className = "tns-t-ct";

      for (var i = 0; i < count; i++) {
        str += '<div></div>';
      }

      outer.innerHTML = str;
      wrapper.appendChild(outer);
      body.appendChild(wrapper);

      supported = Math.abs(wrapper.getBoundingClientRect().left - outer.children[count - perPage].getBoundingClientRect().left) < 2;

      body.fake ? resetFakeBody(body, docOverflow) : wrapper.remove();

      return supported;
    }

    function mediaquerySupport () {
      var doc = document,
          body = getBody(),
          docOverflow = setFakeBody(body),
          div = doc.createElement('div'),
          style = doc.createElement('style'),
          rule = '@media all and (min-width:1px){.tns-mq-test{position:absolute}}',
          position;

      style.type = 'text/css';
      div.className = 'tns-mq-test';

      body.appendChild(style);
      body.appendChild(div);

      if (style.styleSheet) {
        style.styleSheet.cssText = rule;
      } else {
        style.appendChild(doc.createTextNode(rule));
      }

      position = window.getComputedStyle ? window.getComputedStyle(div).position : div.currentStyle['position'];

      body.fake ? resetFakeBody(body, docOverflow) : div.remove();

      return position === "absolute";
    }

    // create and append style sheet
    function createStyleSheet (media) {
      // Create the <style> tag
      var style = document.createElement("style");
      // style.setAttribute("type", "text/css");

      // Add a media (and/or media query) here if you'd like!
      // style.setAttribute("media", "screen")
      // style.setAttribute("media", "only screen and (max-width : 1024px)")
      if (media) { style.setAttribute("media", media); }

      // WebKit hack :(
      // style.appendChild(document.createTextNode(""));

      // Add the <style> element to the page
      document.querySelector('head').appendChild(style);

      return style.sheet ? style.sheet : style.styleSheet;
    }

    // cross browsers addRule method
    function addCSSRule(sheet, selector, rules, index) {
      // return raf(function() {
        'insertRule' in sheet ?
          sheet.insertRule(selector + '{' + rules + '}', index) :
          sheet.addRule(selector, rules, index);
      // });
    }

    // cross browsers addRule method
    function removeCSSRule(sheet, index) {
      // return raf(function() {
        'deleteRule' in sheet ?
          sheet.deleteRule(index) :
          sheet.removeRule(index);
      // });
    }

    function getCssRulesLength(sheet) {
      var rule = ('insertRule' in sheet) ? sheet.cssRules : sheet.rules;
      return rule.length;
    }

    function toDegree (y, x) {
      return Math.atan2(y, x) * (180 / Math.PI);
    }

    function getTouchDirection(angle, range) {
      var direction = false,
          gap = Math.abs(90 - Math.abs(angle));
          
      if (gap >= 90 - range) {
        direction = 'horizontal';
      } else if (gap <= range) {
        direction = 'vertical';
      }

      return direction;
    }

    // https://toddmotto.com/ditch-the-array-foreach-call-nodelist-hack/
    function forEach (arr, callback, scope) {
      for (var i = 0, l = arr.length; i < l; i++) {
        callback.call(scope, arr[i], i);
      }
    }

    var classListSupport = 'classList' in document.createElement('_');

    var hasClass = classListSupport ?
        function (el, str) { return el.classList.contains(str); } :
        function (el, str) { return el.className.indexOf(str) >= 0; };

    var addClass = classListSupport ?
        function (el, str) {
          if (!hasClass(el,  str)) { el.classList.add(str); }
        } :
        function (el, str) {
          if (!hasClass(el,  str)) { el.className += ' ' + str; }
        };

    var removeClass = classListSupport ?
        function (el, str) {
          if (hasClass(el,  str)) { el.classList.remove(str); }
        } :
        function (el, str) {
          if (hasClass(el, str)) { el.className = el.className.replace(str, ''); }
        };

    function hasAttr(el, attr) {
      return el.hasAttribute(attr);
    }

    function getAttr(el, attr) {
      return el.getAttribute(attr);
    }

    function isNodeList(el) {
      // Only NodeList has the "item()" function
      return typeof el.item !== "undefined"; 
    }

    function setAttrs(els, attrs) {
      els = (isNodeList(els) || els instanceof Array) ? els : [els];
      if (Object.prototype.toString.call(attrs) !== '[object Object]') { return; }

      for (var i = els.length; i--;) {
        for(var key in attrs) {
          els[i].setAttribute(key, attrs[key]);
        }
      }
    }

    function removeAttrs(els, attrs) {
      els = (isNodeList(els) || els instanceof Array) ? els : [els];
      attrs = (attrs instanceof Array) ? attrs : [attrs];

      var attrLength = attrs.length;
      for (var i = els.length; i--;) {
        for (var j = attrLength; j--;) {
          els[i].removeAttribute(attrs[j]);
        }
      }
    }

    function arrayFromNodeList (nl) {
      var arr = [];
      for (var i = 0, l = nl.length; i < l; i++) {
        arr.push(nl[i]);
      }
      return arr;
    }

    function hideElement(el, forceHide) {
      if (el.style.display !== 'none') { el.style.display = 'none'; }
    }

    function showElement(el, forceHide) {
      if (el.style.display === 'none') { el.style.display = ''; }
    }

    function isVisible(el) {
      return window.getComputedStyle(el).display !== 'none';
    }

    function whichProperty(props){
      if (typeof props === 'string') {
        var arr = [props],
            Props = props.charAt(0).toUpperCase() + props.substr(1),
            prefixes = ['Webkit', 'Moz', 'ms', 'O'];
            
        prefixes.forEach(function(prefix) {
          if (prefix !== 'ms' || props === 'transform') {
            arr.push(prefix + Props);
          }
        });

        props = arr;
      }

      var el = document.createElement('fakeelement'),
          len = props.length;
      for(var i = 0; i < props.length; i++){
        var prop = props[i];
        if( el.style[prop] !== undefined ){ return prop; }
      }

      return false; // explicit for ie9-
    }

    function has3DTransforms(tf){
      if (!tf) { return false; }
      if (!window.getComputedStyle) { return false; }
      
      var doc = document,
          body = getBody(),
          docOverflow = setFakeBody(body),
          el = doc.createElement('p'),
          has3d,
          cssTF = tf.length > 9 ? '-' + tf.slice(0, -9).toLowerCase() + '-' : '';

      cssTF += 'transform';

      // Add it to the body to get the computed style
      body.insertBefore(el, null);

      el.style[tf] = 'translate3d(1px,1px,1px)';
      has3d = window.getComputedStyle(el).getPropertyValue(cssTF);

      body.fake ? resetFakeBody(body, docOverflow) : el.remove();

      return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
    }

    // get transitionend, animationend based on transitionDuration
    // @propin: string
    // @propOut: string, first-letter uppercase
    // Usage: getEndProperty('WebkitTransitionDuration', 'Transition') => webkitTransitionEnd
    function getEndProperty(propIn, propOut) {
      var endProp = false;
      if (/^Webkit/.test(propIn)) {
        endProp = 'webkit' + propOut + 'End';
      } else if (/^O/.test(propIn)) {
        endProp = 'o' + propOut + 'End';
      } else if (propIn) {
        endProp = propOut.toLowerCase() + 'end';
      }
      return endProp;
    }

    // Test via a getter in the options object to see if the passive property is accessed
    var supportsPassive = false;
    try {
      var opts = Object.defineProperty({}, 'passive', {
        get: function() {
          supportsPassive = true;
        }
      });
      window.addEventListener("test", null, opts);
    } catch (e) {}
    var passiveOption = supportsPassive ? { passive: true } : false;

    function addEvents(el, obj, preventScrolling) {
      for (var prop in obj) {
        var option = ['touchstart', 'touchmove'].indexOf(prop) >= 0 && !preventScrolling ? passiveOption : false;
        el.addEventListener(prop, obj[prop], option);
      }
    }

    function removeEvents(el, obj) {
      for (var prop in obj) {
        var option = ['touchstart', 'touchmove'].indexOf(prop) >= 0 ? passiveOption : false;
        el.removeEventListener(prop, obj[prop], option);
      }
    }

    function Events() {
      return {
        topics: {},
        on: function (eventName, fn) {
          this.topics[eventName] = this.topics[eventName] || [];
          this.topics[eventName].push(fn);
        },
        off: function(eventName, fn) {
          if (this.topics[eventName]) {
            for (var i = 0; i < this.topics[eventName].length; i++) {
              if (this.topics[eventName][i] === fn) {
                this.topics[eventName].splice(i, 1);
                break;
              }
            }
          }
        },
        emit: function (eventName, data) {
          data.type = eventName;
          if (this.topics[eventName]) {
            this.topics[eventName].forEach(function(fn) {
              fn(data, eventName);
            });
          }
        }
      };
    }

    function jsTransform(element, attr, prefix, postfix, to, duration, callback) {
      var tick = Math.min(duration, 10),
          unit = (to.indexOf('%') >= 0) ? '%' : 'px',
          to = to.replace(unit, ''),
          from = Number(element.style[attr].replace(prefix, '').replace(postfix, '').replace(unit, '')),
          positionTick = (to - from) / duration * tick;

      setTimeout(moveElement, tick);
      function moveElement() {
        duration -= tick;
        from += positionTick;
        element.style[attr] = prefix + from + unit + postfix;
        if (duration > 0) { 
          setTimeout(moveElement, tick); 
        } else {
          callback();
        }
      }
    }

    var tns = function(options) {
      options = extend({
        container: '.slider',
        mode: 'carousel',
        axis: 'horizontal',
        items: 1,
        gutter: 0,
        edgePadding: 0,
        fixedWidth: false,
        autoWidth: false,
        viewportMax: false,
        slideBy: 1,
        center: false,
        controls: true,
        controlsPosition: 'top',
        controlsText: ['prev', 'next'],
        controlsContainer: false,
        prevButton: false,
        nextButton: false,
        nav: true,
        navPosition: 'top',
        navContainer: false,
        navAsThumbnails: false,
        arrowKeys: false,
        speed: 300,
        autoplay: false,
        autoplayPosition: 'top',
        autoplayTimeout: 5000,
        autoplayDirection: 'forward',
        autoplayText: ['start', 'stop'],
        autoplayHoverPause: false,
        autoplayButton: false,
        autoplayButtonOutput: true,
        autoplayResetOnVisibility: true,
        animateIn: 'tns-fadeIn',
        animateOut: 'tns-fadeOut',
        animateNormal: 'tns-normal',
        animateDelay: false,
        loop: true,
        rewind: false,
        autoHeight: false,
        responsive: false,
        lazyload: false,
        lazyloadSelector: '.tns-lazy-img',
        touch: true,
        mouseDrag: false,
        swipeAngle: 15,
        nested: false,
        preventActionWhenRunning: false,
        preventScrollOnTouch: false,
        freezable: true,
        onInit: false,
        useLocalStorage: true
      }, options || {});
      
      var doc = document,
          win = window,
          KEYS = {
            ENTER: 13,
            SPACE: 32,
            LEFT: 37,
            RIGHT: 39
          },
          tnsStorage = {},
          localStorageAccess = options.useLocalStorage;

      if (localStorageAccess) {
        // check browser version and local storage access
        var browserInfo = navigator.userAgent;
        var uid = new Date;

        try {
          tnsStorage = win.localStorage;
          if (tnsStorage) {
            tnsStorage.setItem(uid, uid);
            localStorageAccess = tnsStorage.getItem(uid) == uid;
            tnsStorage.removeItem(uid);
          } else {
            localStorageAccess = false;
          }
          if (!localStorageAccess) { tnsStorage = {}; }
        } catch(e) {
          localStorageAccess = false;
        }

        if (localStorageAccess) {
          // remove storage when browser version changes
          if (tnsStorage['tnsApp'] && tnsStorage['tnsApp'] !== browserInfo) {
            ['tC', 'tPL', 'tMQ', 'tTf', 't3D', 'tTDu', 'tTDe', 'tADu', 'tADe', 'tTE', 'tAE'].forEach(function(item) { tnsStorage.removeItem(item); });
          }
          // update browserInfo
          localStorage['tnsApp'] = browserInfo;
        }
      }

      var CALC = tnsStorage['tC'] ? checkStorageValue(tnsStorage['tC']) : setLocalStorage(tnsStorage, 'tC', calc(), localStorageAccess),
          PERCENTAGELAYOUT = tnsStorage['tPL'] ? checkStorageValue(tnsStorage['tPL']) : setLocalStorage(tnsStorage, 'tPL', percentageLayout(), localStorageAccess),
          CSSMQ = tnsStorage['tMQ'] ? checkStorageValue(tnsStorage['tMQ']) : setLocalStorage(tnsStorage, 'tMQ', mediaquerySupport(), localStorageAccess),
          TRANSFORM = tnsStorage['tTf'] ? checkStorageValue(tnsStorage['tTf']) : setLocalStorage(tnsStorage, 'tTf', whichProperty('transform'), localStorageAccess),
          HAS3DTRANSFORMS = tnsStorage['t3D'] ? checkStorageValue(tnsStorage['t3D']) : setLocalStorage(tnsStorage, 't3D', has3DTransforms(TRANSFORM), localStorageAccess),
          TRANSITIONDURATION = tnsStorage['tTDu'] ? checkStorageValue(tnsStorage['tTDu']) : setLocalStorage(tnsStorage, 'tTDu', whichProperty('transitionDuration'), localStorageAccess),
          TRANSITIONDELAY = tnsStorage['tTDe'] ? checkStorageValue(tnsStorage['tTDe']) : setLocalStorage(tnsStorage, 'tTDe', whichProperty('transitionDelay'), localStorageAccess),
          ANIMATIONDURATION = tnsStorage['tADu'] ? checkStorageValue(tnsStorage['tADu']) : setLocalStorage(tnsStorage, 'tADu', whichProperty('animationDuration'), localStorageAccess),
          ANIMATIONDELAY = tnsStorage['tADe'] ? checkStorageValue(tnsStorage['tADe']) : setLocalStorage(tnsStorage, 'tADe', whichProperty('animationDelay'), localStorageAccess),
          TRANSITIONEND = tnsStorage['tTE'] ? checkStorageValue(tnsStorage['tTE']) : setLocalStorage(tnsStorage, 'tTE', getEndProperty(TRANSITIONDURATION, 'Transition'), localStorageAccess),
          ANIMATIONEND = tnsStorage['tAE'] ? checkStorageValue(tnsStorage['tAE']) : setLocalStorage(tnsStorage, 'tAE', getEndProperty(ANIMATIONDURATION, 'Animation'), localStorageAccess);

      // get element nodes from selectors
      var supportConsoleWarn = win.console && typeof win.console.warn === "function",
          tnsList = ['container', 'controlsContainer', 'prevButton', 'nextButton', 'navContainer', 'autoplayButton'], 
          optionsElements = {};
          
      tnsList.forEach(function(item) {
        if (typeof options[item] === 'string') {
          var str = options[item],
              el = doc.querySelector(str);
          optionsElements[item] = str;

          if (el && el.nodeName) {
            options[item] = el;
          } else {
            if (supportConsoleWarn) { console.warn('Can\'t find', options[item]); }
            return;
          }
        }
      });

      // make sure at least 1 slide
      if (options.container.children.length < 1) {
        if (supportConsoleWarn) { console.warn('No slides found in', options.container); }
        return;
       }

      // update options
      var responsive = options.responsive,
          nested = options.nested,
          carousel = options.mode === 'carousel' ? true : false;

      if (responsive) {
        // apply responsive[0] to options and remove it
        if (0 in responsive) {
          options = extend(options, responsive[0]);
          delete responsive[0];
        }

        var responsiveTem = {};
        for (var key in responsive) {
          var val = responsive[key];
          // update responsive
          // from: 300: 2
          // to: 
          //   300: { 
          //     items: 2 
          //   } 
          val = typeof val === 'number' ? {items: val} : val;
          responsiveTem[key] = val;
        }
        responsive = responsiveTem;
        responsiveTem = null;
      }

      // update options
      function updateOptions (obj) {
        for (var key in obj) {
          if (!carousel) {
            if (key === 'slideBy') { obj[key] = 'page'; }
            if (key === 'edgePadding') { obj[key] = false; }
            if (key === 'autoHeight') { obj[key] = false; }
          }

          // update responsive options
          if (key === 'responsive') { updateOptions(obj[key]); }
        }
      }
      if (!carousel) { updateOptions(options); }


      // === define and set variables ===
      if (!carousel) {
        options.axis = 'horizontal';
        options.slideBy = 'page';
        options.edgePadding = false;

        var animateIn = options.animateIn,
            animateOut = options.animateOut,
            animateDelay = options.animateDelay,
            animateNormal = options.animateNormal;
      }

      var horizontal = options.axis === 'horizontal' ? true : false,
          outerWrapper = doc.createElement('div'),
          innerWrapper = doc.createElement('div'),
          middleWrapper,
          container = options.container,
          containerParent = container.parentNode,
          containerHTML = container.outerHTML,
          slideItems = container.children,
          slideCount = slideItems.length,
          breakpointZone,
          windowWidth = getWindowWidth(),
          isOn = false;
      if (responsive) { setBreakpointZone(); }
      if (carousel) { container.className += ' tns-vpfix'; }

      // fixedWidth: viewport > rightBoundary > indexMax
      var autoWidth = options.autoWidth,
          fixedWidth = getOption('fixedWidth'),
          edgePadding = getOption('edgePadding'),
          gutter = getOption('gutter'),
          viewport = getViewportWidth(),
          center = getOption('center'),
          items = !autoWidth ? Math.floor(getOption('items')) : 1,
          slideBy = getOption('slideBy'),
          viewportMax = options.viewportMax || options.fixedWidthViewportWidth,
          arrowKeys = getOption('arrowKeys'),
          speed = getOption('speed'),
          rewind = options.rewind,
          loop = rewind ? false : options.loop,
          autoHeight = getOption('autoHeight'),
          controls = getOption('controls'),
          controlsText = getOption('controlsText'),
          nav = getOption('nav'),
          touch = getOption('touch'),
          mouseDrag = getOption('mouseDrag'),
          autoplay = getOption('autoplay'),
          autoplayTimeout = getOption('autoplayTimeout'),
          autoplayText = getOption('autoplayText'),
          autoplayHoverPause = getOption('autoplayHoverPause'),
          autoplayResetOnVisibility = getOption('autoplayResetOnVisibility'),
          sheet = createStyleSheet(),
          lazyload = options.lazyload,
          lazyloadSelector = options.lazyloadSelector,
          slidePositions, // collection of slide positions
          slideItemsOut = [],
          cloneCount = loop ? getCloneCountForLoop() : 0,
          slideCountNew = !carousel ? slideCount + cloneCount : slideCount + cloneCount * 2,
          hasRightDeadZone = (fixedWidth || autoWidth) && !loop ? true : false,
          rightBoundary = fixedWidth ? getRightBoundary() : null,
          updateIndexBeforeTransform = (!carousel || !loop) ? true : false,
          // transform
          transformAttr = horizontal ? 'left' : 'top',
          transformPrefix = '',
          transformPostfix = '',
          // index
          getIndexMax = (function () {
            if (fixedWidth) {
              return function() { return center && !loop ? slideCount - 1 : Math.ceil(- rightBoundary / (fixedWidth + gutter)); };
            } else if (autoWidth) {
              return function() {
                for (var i = slideCountNew; i--;) {
                  if (slidePositions[i] >= - rightBoundary) { return i; }
                }
              };
            } else {
              return function() {
                if (center && carousel && !loop) {
                  return slideCount - 1;
                } else {
                  return loop || carousel ? Math.max(0, slideCountNew - Math.ceil(items)) : slideCountNew - 1;
                }
              };
            }
          })(),
          index = getStartIndex(getOption('startIndex')),
          indexCached = index,
          displayIndex = getCurrentSlide(),
          indexMin = 0,
          indexMax = !autoWidth ? getIndexMax() : null,
          // resize
          resizeTimer,
          preventActionWhenRunning = options.preventActionWhenRunning,
          swipeAngle = options.swipeAngle,
          moveDirectionExpected = swipeAngle ? '?' : true,
          running = false,
          onInit = options.onInit,
          events = new Events(),
          // id, class
          newContainerClasses = ' tns-slider tns-' + options.mode,
          slideId = container.id || getSlideId(),
          disable = getOption('disable'),
          disabled = false,
          freezable = options.freezable,
          freeze = freezable && !autoWidth ? getFreeze() : false,
          frozen = false,
          controlsEvents = {
            'click': onControlsClick,
            'keydown': onControlsKeydown
          },
          navEvents = {
            'click': onNavClick,
            'keydown': onNavKeydown
          },
          hoverEvents = {
            'mouseover': mouseoverPause,
            'mouseout': mouseoutRestart
          },
          visibilityEvent = {'visibilitychange': onVisibilityChange},
          docmentKeydownEvent = {'keydown': onDocumentKeydown},
          touchEvents = {
            'touchstart': onPanStart,
            'touchmove': onPanMove,
            'touchend': onPanEnd,
            'touchcancel': onPanEnd
          }, dragEvents = {
            'mousedown': onPanStart,
            'mousemove': onPanMove,
            'mouseup': onPanEnd,
            'mouseleave': onPanEnd
          },
          hasControls = hasOption('controls'),
          hasNav = hasOption('nav'),
          navAsThumbnails = autoWidth ? true : options.navAsThumbnails,
          hasAutoplay = hasOption('autoplay'),
          hasTouch = hasOption('touch'),
          hasMouseDrag = hasOption('mouseDrag'),
          slideActiveClass = 'tns-slide-active',
          imgCompleteClass = 'tns-complete',
          imgEvents = {
            'load': onImgLoaded,
            'error': onImgFailed
          },
          imgsComplete,
          liveregionCurrent,
          preventScroll = options.preventScrollOnTouch === 'force' ? true : false;

      // controls
      if (hasControls) {
        var controlsContainer = options.controlsContainer,
            controlsContainerHTML = options.controlsContainer ? options.controlsContainer.outerHTML : '',
            prevButton = options.prevButton,
            nextButton = options.nextButton,
            prevButtonHTML = options.prevButton ? options.prevButton.outerHTML : '',
            nextButtonHTML = options.nextButton ? options.nextButton.outerHTML : '',
            prevIsButton,
            nextIsButton;
      }

      // nav
      if (hasNav) {
        var navContainer = options.navContainer,
            navContainerHTML = options.navContainer ? options.navContainer.outerHTML : '',
            navItems,
            pages = autoWidth ? slideCount : getPages(),
            pagesCached = 0,
            navClicked = -1,
            navCurrentIndex = getCurrentNavIndex(),
            navCurrentIndexCached = navCurrentIndex,
            navActiveClass = 'tns-nav-active',
            navStr = 'Carousel Page ',
            navStrCurrent = ' (Current Slide)';
      }

      // autoplay
      if (hasAutoplay) {
        var autoplayDirection = options.autoplayDirection === 'forward' ? 1 : -1,
            autoplayButton = options.autoplayButton,
            autoplayButtonHTML = options.autoplayButton ? options.autoplayButton.outerHTML : '',
            autoplayHtmlStrings = ['<span class=\'tns-visually-hidden\'>', ' animation</span>'],
            autoplayTimer,
            animating,
            autoplayHoverPaused,
            autoplayUserPaused,
            autoplayVisibilityPaused;
      }

      if (hasTouch || hasMouseDrag) {
        var initPosition = {},
            lastPosition = {},
            translateInit,
            disX,
            disY,
            panStart = false,
            rafIndex,
            getDist = horizontal ? 
              function(a, b) { return a.x - b.x; } :
              function(a, b) { return a.y - b.y; };
      }
      
      // disable slider when slidecount <= items
      if (!autoWidth) { resetVariblesWhenDisable(disable || freeze); }

      if (TRANSFORM) {
        transformAttr = TRANSFORM;
        transformPrefix = 'translate';

        if (HAS3DTRANSFORMS) {
          transformPrefix += horizontal ? '3d(' : '3d(0px, ';
          transformPostfix = horizontal ? ', 0px, 0px)' : ', 0px)';
        } else {
          transformPrefix += horizontal ? 'X(' : 'Y(';
          transformPostfix = ')';
        }

      }

      if (carousel) { container.className = container.className.replace('tns-vpfix', ''); }
      initStructure();
      initSheet();
      initSliderTransform();

      // === COMMON FUNCTIONS === //
      function resetVariblesWhenDisable (condition) {
        if (condition) {
          controls = nav = touch = mouseDrag = arrowKeys = autoplay = autoplayHoverPause = autoplayResetOnVisibility = false;
        }
      }

      function getCurrentSlide () {
        var tem = carousel ? index - cloneCount : index;
        while (tem < 0) { tem += slideCount; }
        return tem%slideCount + 1;
      }

      function getStartIndex (ind) {
        ind = ind ? Math.max(0, Math.min(loop ? slideCount - 1 : slideCount - items, ind)) : 0;
        return carousel ? ind + cloneCount : ind;
      }

      function getAbsIndex (i) {
        if (i == null) { i = index; }

        if (carousel) { i -= cloneCount; }
        while (i < 0) { i += slideCount; }

        return Math.floor(i%slideCount);
      }

      function getCurrentNavIndex () {
        var absIndex = getAbsIndex(),
            result;

        result = navAsThumbnails ? absIndex : 
          fixedWidth || autoWidth ? Math.ceil((absIndex + 1) * pages / slideCount - 1) : 
              Math.floor(absIndex / items);

        // set active nav to the last one when reaches the right edge
        if (!loop && carousel && index === indexMax) { result = pages - 1; }

        return result;
      }

      function getItemsMax () {
        // fixedWidth or autoWidth while viewportMax is not available
        if (autoWidth || (fixedWidth && !viewportMax)) {
          return slideCount - 1;
        // most cases
        } else {
          var str = fixedWidth ? 'fixedWidth' : 'items',
              arr = [];

          if (fixedWidth || options[str] < slideCount) { arr.push(options[str]); }

          if (responsive) {
            for (var bp in responsive) {
              var tem = responsive[bp][str];
              if (tem && (fixedWidth || tem < slideCount)) { arr.push(tem); }
            }
          }

          if (!arr.length) { arr.push(0); }

          return Math.ceil(fixedWidth ? viewportMax / Math.min.apply(null, arr) : Math.max.apply(null, arr));
        }
      }

      function getCloneCountForLoop () {
        var itemsMax = getItemsMax(),
            result = carousel ? Math.ceil((itemsMax * 5 - slideCount)/2) : (itemsMax * 4 - slideCount);
        result = Math.max(itemsMax, result);

        return hasOption('edgePadding') ? result + 1 : result;
      }

      function getWindowWidth () {
        return win.innerWidth || doc.documentElement.clientWidth || doc.body.clientWidth;
      }

      function getInsertPosition (pos) {
        return pos === 'top' ? 'afterbegin' : 'beforeend';
      }

      function getClientWidth (el) {
        var div = doc.createElement('div'), rect, width;
        el.appendChild(div);
        rect = div.getBoundingClientRect();
        width = rect.right - rect.left;
        div.remove();
        return width || getClientWidth(el.parentNode);
      }

      function getViewportWidth () {
        var gap = edgePadding ? edgePadding * 2 - gutter : 0;
        return getClientWidth(containerParent) - gap;
      }

      function hasOption (item) {
        if (options[item]) {
          return true;
        } else {
          if (responsive) {
            for (var bp in responsive) {
              if (responsive[bp][item]) { return true; }
            }
          }
          return false;
        }
      }

      // get option:
      // fixed width: viewport, fixedWidth, gutter => items
      // others: window width => all variables
      // all: items => slideBy
      function getOption (item, ww) {
        if (ww == null) { ww = windowWidth; }

        if (item === 'items' && fixedWidth) {
          return Math.floor((viewport + gutter) / (fixedWidth + gutter)) || 1;

        } else {
          var result = options[item];

          if (responsive) {
            for (var bp in responsive) {
              // bp: convert string to number
              if (ww >= parseInt(bp)) {
                if (item in responsive[bp]) { result = responsive[bp][item]; }
              }
            }
          }

          if (item === 'slideBy' && result === 'page') { result = getOption('items'); }
          if (!carousel && (item === 'slideBy' || item === 'items')) { result = Math.floor(result); }

          return result;
        }
      }

      function getSlideMarginLeft (i) {
        return CALC ? 
          CALC + '(' + i * 100 + '% / ' + slideCountNew + ')' : 
          i * 100 / slideCountNew + '%';
      }

      function getInnerWrapperStyles (edgePaddingTem, gutterTem, fixedWidthTem, speedTem, autoHeightBP) {
        var str = '';

        if (edgePaddingTem !== undefined) {
          var gap = edgePaddingTem;
          if (gutterTem) { gap -= gutterTem; }
          str = horizontal ?
            'margin: 0 ' + gap + 'px 0 ' + edgePaddingTem + 'px;' :
            'margin: ' + edgePaddingTem + 'px 0 ' + gap + 'px 0;';
        } else if (gutterTem && !fixedWidthTem) {
          var gutterTemUnit = '-' + gutterTem + 'px',
              dir = horizontal ? gutterTemUnit + ' 0 0' : '0 ' + gutterTemUnit + ' 0';
          str = 'margin: 0 ' + dir + ';';
        }

        if (!carousel && autoHeightBP && TRANSITIONDURATION && speedTem) { str += getTransitionDurationStyle(speedTem); }
        return str;
      }

      function getContainerWidth (fixedWidthTem, gutterTem, itemsTem) {
        if (fixedWidthTem) {
          return (fixedWidthTem + gutterTem) * slideCountNew + 'px';
        } else {
          return CALC ?
            CALC + '(' + slideCountNew * 100 + '% / ' + itemsTem + ')' :
            slideCountNew * 100 / itemsTem + '%';
        }
      }

      function getSlideWidthStyle (fixedWidthTem, gutterTem, itemsTem) {
        var width;

        if (fixedWidthTem) {
          width = (fixedWidthTem + gutterTem) + 'px';
        } else {
          if (!carousel) { itemsTem = Math.floor(itemsTem); }
          var dividend = carousel ? slideCountNew : itemsTem;
          width = CALC ? 
            CALC + '(100% / ' + dividend + ')' : 
            100 / dividend + '%';
        }

        width = 'width:' + width;

        // inner slider: overwrite outer slider styles
        return nested !== 'inner' ? width + ';' : width + ' !important;';
      }

      function getSlideGutterStyle (gutterTem) {
        var str = '';

        // gutter maybe interger || 0
        // so can't use 'if (gutter)'
        if (gutterTem !== false) {
          var prop = horizontal ? 'padding-' : 'margin-',
              dir = horizontal ? 'right' : 'bottom';
          str = prop +  dir + ': ' + gutterTem + 'px;';
        }

        return str;
      }

      function getCSSPrefix (name, num) {
        var prefix = name.substring(0, name.length - num).toLowerCase();
        if (prefix) { prefix = '-' + prefix + '-'; }

        return prefix;
      }

      function getTransitionDurationStyle (speed) {
        return getCSSPrefix(TRANSITIONDURATION, 18) + 'transition-duration:' + speed / 1000 + 's;';
      }

      function getAnimationDurationStyle (speed) {
        return getCSSPrefix(ANIMATIONDURATION, 17) + 'animation-duration:' + speed / 1000 + 's;';
      }

      function initStructure () {
        var classOuter = 'tns-outer',
            classInner = 'tns-inner',
            hasGutter = hasOption('gutter');

        outerWrapper.className = classOuter;
        innerWrapper.className = classInner;
        outerWrapper.id = slideId + '-ow';
        innerWrapper.id = slideId + '-iw';

        // set container properties
        if (container.id === '') { container.id = slideId; }
        newContainerClasses += PERCENTAGELAYOUT || autoWidth ? ' tns-subpixel' : ' tns-no-subpixel';
        newContainerClasses += CALC ? ' tns-calc' : ' tns-no-calc';
        if (autoWidth) { newContainerClasses += ' tns-autowidth'; }
        newContainerClasses += ' tns-' + options.axis;
        container.className += newContainerClasses;

        // add constrain layer for carousel
        if (carousel) {
          middleWrapper = doc.createElement('div');
          middleWrapper.id = slideId + '-mw';
          middleWrapper.className = 'tns-ovh';

          outerWrapper.appendChild(middleWrapper);
          middleWrapper.appendChild(innerWrapper);
        } else {
          outerWrapper.appendChild(innerWrapper);
        }

        if (autoHeight) {
          var wp = middleWrapper ? middleWrapper : innerWrapper;
          wp.className += ' tns-ah';
        }

        containerParent.insertBefore(outerWrapper, container);
        innerWrapper.appendChild(container);

        // add id, class, aria attributes 
        // before clone slides
        forEach(slideItems, function(item, i) {
          addClass(item, 'tns-item');
          if (!item.id) { item.id = slideId + '-item' + i; }
          if (!carousel && animateNormal) { addClass(item, animateNormal); }
          setAttrs(item, {
            'aria-hidden': 'true',
            'tabindex': '-1'
          });
        });

        // ## clone slides
        // carousel: n + slides + n
        // gallery:      slides + n
        if (cloneCount) {
          var fragmentBefore = doc.createDocumentFragment(), 
              fragmentAfter = doc.createDocumentFragment();

          for (var j = cloneCount; j--;) {
            var num = j%slideCount,
                cloneFirst = slideItems[num].cloneNode(true);
            removeAttrs(cloneFirst, 'id');
            fragmentAfter.insertBefore(cloneFirst, fragmentAfter.firstChild);

            if (carousel) {
              var cloneLast = slideItems[slideCount - 1 - num].cloneNode(true);
              removeAttrs(cloneLast, 'id');
              fragmentBefore.appendChild(cloneLast);
            }
          }

          container.insertBefore(fragmentBefore, container.firstChild);
          container.appendChild(fragmentAfter);
          slideItems = container.children;
        }

      }

      function initSliderTransform () {
        // ## images loaded/failed
        if (hasOption('autoHeight') || autoWidth || !horizontal) {
          var imgs = container.querySelectorAll('img');

          // add complete class if all images are loaded/failed
          forEach(imgs, function(img) {
            var src = img.src;
            
            if (src && src.indexOf('data:image') < 0) {
              addEvents(img, imgEvents);
              img.src = '';
              img.src = src;
              addClass(img, 'loading');
            } else if (!lazyload) {
              imgLoaded(img);
            }
          });

          // All imgs are completed
          raf$1(function(){ imgsLoadedCheck(arrayFromNodeList(imgs), function() { imgsComplete = true; }); });

          // Check imgs in window only for auto height
          if (!autoWidth && horizontal) { imgs = getImageArray(index, Math.min(index + items - 1, slideCountNew - 1)); }

          lazyload ? initSliderTransformStyleCheck() : raf$1(function(){ imgsLoadedCheck(arrayFromNodeList(imgs), initSliderTransformStyleCheck); });

        } else {
          // set container transform property
          if (carousel) { doContainerTransformSilent(); }

          // update slider tools and events
          initTools();
          initEvents();
        }
      }

      function initSliderTransformStyleCheck () {
        if (autoWidth) {
          // check styles application
          var num = loop ? index : slideCount - 1;
          (function stylesApplicationCheck() {
            slideItems[num - 1].getBoundingClientRect().right.toFixed(2) === slideItems[num].getBoundingClientRect().left.toFixed(2) ?
            initSliderTransformCore() :
            setTimeout(function(){ stylesApplicationCheck(); }, 16);
          })();
        } else {
          initSliderTransformCore();
        }
      }


      function initSliderTransformCore () {
        // run Fn()s which are rely on image loading
        if (!horizontal || autoWidth) {
          setSlidePositions();

          if (autoWidth) {
            rightBoundary = getRightBoundary();
            if (freezable) { freeze = getFreeze(); }
            indexMax = getIndexMax(); // <= slidePositions, rightBoundary <=
            resetVariblesWhenDisable(disable || freeze);
          } else {
            updateContentWrapperHeight();
          }
        }

        // set container transform property
        if (carousel) { doContainerTransformSilent(); }

        // update slider tools and events
        initTools();
        initEvents();
      }

      function initSheet () {
        // gallery:
        // set animation classes and left value for gallery slider
        if (!carousel) { 
          for (var i = index, l = index + Math.min(slideCount, items); i < l; i++) {
            var item = slideItems[i];
            item.style.left = (i - index) * 100 / items + '%';
            addClass(item, animateIn);
            removeClass(item, animateNormal);
          }
        }

        // #### LAYOUT

        // ## INLINE-BLOCK VS FLOAT

        // ## PercentageLayout:
        // slides: inline-block
        // remove blank space between slides by set font-size: 0

        // ## Non PercentageLayout:
        // slides: float
        //         margin-right: -100%
        //         margin-left: ~

        // Resource: https://docs.google.com/spreadsheets/d/147up245wwTXeQYve3BRSAD4oVcvQmuGsFteJOeA5xNQ/edit?usp=sharing
        if (horizontal) {
          if (PERCENTAGELAYOUT || autoWidth) {
            addCSSRule(sheet, '#' + slideId + ' > .tns-item', 'font-size:' + win.getComputedStyle(slideItems[0]).fontSize + ';', getCssRulesLength(sheet));
            addCSSRule(sheet, '#' + slideId, 'font-size:0;', getCssRulesLength(sheet));
          } else if (carousel) {
            forEach(slideItems, function (slide, i) {
              slide.style.marginLeft = getSlideMarginLeft(i);
            });
          }
        }


        // ## BASIC STYLES
        if (CSSMQ) {
          // middle wrapper style
          if (TRANSITIONDURATION) {
            var str = middleWrapper && options.autoHeight ? getTransitionDurationStyle(options.speed) : '';
            addCSSRule(sheet, '#' + slideId + '-mw', str, getCssRulesLength(sheet));
          }

          // inner wrapper styles
          str = getInnerWrapperStyles(options.edgePadding, options.gutter, options.fixedWidth, options.speed, options.autoHeight);
          addCSSRule(sheet, '#' + slideId + '-iw', str, getCssRulesLength(sheet));

          // container styles
          if (carousel) {
            str = horizontal && !autoWidth ? 'width:' + getContainerWidth(options.fixedWidth, options.gutter, options.items) + ';' : '';
            if (TRANSITIONDURATION) { str += getTransitionDurationStyle(speed); }
            addCSSRule(sheet, '#' + slideId, str, getCssRulesLength(sheet));
          }

          // slide styles
          str = horizontal && !autoWidth ? getSlideWidthStyle(options.fixedWidth, options.gutter, options.items) : '';
          if (options.gutter) { str += getSlideGutterStyle(options.gutter); }
          // set gallery items transition-duration
          if (!carousel) {
            if (TRANSITIONDURATION) { str += getTransitionDurationStyle(speed); }
            if (ANIMATIONDURATION) { str += getAnimationDurationStyle(speed); }
          }
          if (str) { addCSSRule(sheet, '#' + slideId + ' > .tns-item', str, getCssRulesLength(sheet)); }

        // non CSS mediaqueries: IE8
        // ## update inner wrapper, container, slides if needed
        // set inline styles for inner wrapper & container
        // insert stylesheet (one line) for slides only (since slides are many)
        } else {
          // middle wrapper styles
          update_carousel_transition_duration();

          // inner wrapper styles
          innerWrapper.style.cssText = getInnerWrapperStyles(edgePadding, gutter, fixedWidth, autoHeight);

          // container styles
          if (carousel && horizontal && !autoWidth) {
            container.style.width = getContainerWidth(fixedWidth, gutter, items);
          }

          // slide styles
          var str = horizontal && !autoWidth ? getSlideWidthStyle(fixedWidth, gutter, items) : '';
          if (gutter) { str += getSlideGutterStyle(gutter); }

          // append to the last line
          if (str) { addCSSRule(sheet, '#' + slideId + ' > .tns-item', str, getCssRulesLength(sheet)); }
        }

        // ## MEDIAQUERIES
        if (responsive && CSSMQ) {
          for (var bp in responsive) {
            // bp: convert string to number
            bp = parseInt(bp);

            var opts = responsive[bp],
                str = '',
                middleWrapperStr = '',
                innerWrapperStr = '',
                containerStr = '',
                slideStr = '',
                itemsBP = !autoWidth ? getOption('items', bp) : null,
                fixedWidthBP = getOption('fixedWidth', bp),
                speedBP = getOption('speed', bp),
                edgePaddingBP = getOption('edgePadding', bp),
                autoHeightBP = getOption('autoHeight', bp),
                gutterBP = getOption('gutter', bp);

            // middle wrapper string
            if (TRANSITIONDURATION && middleWrapper && getOption('autoHeight', bp) && 'speed' in opts) {
              middleWrapperStr = '#' + slideId + '-mw{' + getTransitionDurationStyle(speedBP) + '}';
            }

            // inner wrapper string
            if ('edgePadding' in opts || 'gutter' in opts) {
              innerWrapperStr = '#' + slideId + '-iw{' + getInnerWrapperStyles(edgePaddingBP, gutterBP, fixedWidthBP, speedBP, autoHeightBP) + '}';
            }

            // container string
            if (carousel && horizontal && !autoWidth && ('fixedWidth' in opts || 'items' in opts || (fixedWidth && 'gutter' in opts))) {
              containerStr = 'width:' + getContainerWidth(fixedWidthBP, gutterBP, itemsBP) + ';';
            }
            if (TRANSITIONDURATION && 'speed' in opts) {
              containerStr += getTransitionDurationStyle(speedBP);
            }
            if (containerStr) {
              containerStr = '#' + slideId + '{' + containerStr + '}';
            }

            // slide string
            if ('fixedWidth' in opts || (fixedWidth && 'gutter' in opts) || !carousel && 'items' in opts) {
              slideStr += getSlideWidthStyle(fixedWidthBP, gutterBP, itemsBP);
            }
            if ('gutter' in opts) {
              slideStr += getSlideGutterStyle(gutterBP);
            }
            // set gallery items transition-duration
            if (!carousel && 'speed' in opts) {
              if (TRANSITIONDURATION) { slideStr += getTransitionDurationStyle(speedBP); }
              if (ANIMATIONDURATION) { slideStr += getAnimationDurationStyle(speedBP); }
            }
            if (slideStr) { slideStr = '#' + slideId + ' > .tns-item{' + slideStr + '}'; }

            // add up
            str = middleWrapperStr + innerWrapperStr + containerStr + slideStr;

            if (str) {
              sheet.insertRule('@media (min-width: ' + bp / 16 + 'em) {' + str + '}', sheet.cssRules.length);
            }
          }
        }
      }

      function initTools () {
        // == slides ==
        updateSlideStatus();

        // == live region ==
        outerWrapper.insertAdjacentHTML('afterbegin', '<div class="tns-liveregion tns-visually-hidden" aria-live="polite" aria-atomic="true">slide <span class="current">' + getLiveRegionStr() + '</span>  of ' + slideCount + '</div>');
        liveregionCurrent = outerWrapper.querySelector('.tns-liveregion .current');

        // == autoplayInit ==
        if (hasAutoplay) {
          var txt = autoplay ? 'stop' : 'start';
          if (autoplayButton) {
            setAttrs(autoplayButton, {'data-action': txt});
          } else if (options.autoplayButtonOutput) {
            outerWrapper.insertAdjacentHTML(getInsertPosition(options.autoplayPosition), '<button data-action="' + txt + '">' + autoplayHtmlStrings[0] + txt + autoplayHtmlStrings[1] + autoplayText[0] + '</button>');
            autoplayButton = outerWrapper.querySelector('[data-action]');
          }

          // add event
          if (autoplayButton) {
            addEvents(autoplayButton, {'click': toggleAutoplay});
          }

          if (autoplay) {
            startAutoplay();
            if (autoplayHoverPause) { addEvents(container, hoverEvents); }
            if (autoplayResetOnVisibility) { addEvents(container, visibilityEvent); }
          }
        }
     
        // == navInit ==
        if (hasNav) {
          // customized nav
          // will not hide the navs in case they're thumbnails
          if (navContainer) {
            setAttrs(navContainer, {'aria-label': 'Carousel Pagination'});
            navItems = navContainer.children;
            forEach(navItems, function(item, i) {
              setAttrs(item, {
                'data-nav': i,
                'tabindex': '-1',
                'aria-label': navStr + (i + 1),
                'aria-controls': slideId,
              });
            });

          // generated nav 
          } else {
            var navHtml = '',
                hiddenStr = navAsThumbnails ? '' : 'style="display:none"';
            for (var i = 0; i < slideCount; i++) {
              // hide nav items by default
              navHtml += '<button data-nav="' + i +'" tabindex="-1" aria-controls="' + slideId + '" ' + hiddenStr + ' aria-label="' + navStr + (i + 1) +'"></button>';
            }
            navHtml = '<div class="tns-nav" aria-label="Carousel Pagination">' + navHtml + '</div>';
            outerWrapper.insertAdjacentHTML(getInsertPosition(options.navPosition), navHtml);

            navContainer = outerWrapper.querySelector('.tns-nav');
            navItems = navContainer.children;
          }

          updateNavVisibility();

          // add transition
          if (TRANSITIONDURATION) {
            var prefix = TRANSITIONDURATION.substring(0, TRANSITIONDURATION.length - 18).toLowerCase(),
                str = 'transition: all ' + speed / 1000 + 's';

            if (prefix) {
              str = '-' + prefix + '-' + str;
            }

            addCSSRule(sheet, '[aria-controls^=' + slideId + '-item]', str, getCssRulesLength(sheet));
          }

          setAttrs(navItems[navCurrentIndex], {'aria-label': navStr + (navCurrentIndex + 1) + navStrCurrent});
          removeAttrs(navItems[navCurrentIndex], 'tabindex');
          addClass(navItems[navCurrentIndex], navActiveClass);

          // add events
          addEvents(navContainer, navEvents);
        }



        // == controlsInit ==
        if (hasControls) {
          if (!controlsContainer && (!prevButton || !nextButton)) {
            outerWrapper.insertAdjacentHTML(getInsertPosition(options.controlsPosition), '<div class="tns-controls" aria-label="Carousel Navigation" tabindex="0"><button data-controls="prev" tabindex="-1" aria-controls="' + slideId +'">' + controlsText[0] + '</button><button data-controls="next" tabindex="-1" aria-controls="' + slideId +'">' + controlsText[1] + '</button></div>');

            controlsContainer = outerWrapper.querySelector('.tns-controls');
          }

          if (!prevButton || !nextButton) {
            prevButton = controlsContainer.children[0];
            nextButton = controlsContainer.children[1];
          }

          if (options.controlsContainer) {
            setAttrs(controlsContainer, {
              'aria-label': 'Carousel Navigation',
              'tabindex': '0'
            });
          }

          if (options.controlsContainer || (options.prevButton && options.nextButton)) {
            setAttrs([prevButton, nextButton], {
              'aria-controls': slideId,
              'tabindex': '-1',
            });
          }
          
          if (options.controlsContainer || (options.prevButton && options.nextButton)) {
            setAttrs(prevButton, {'data-controls' : 'prev'});
            setAttrs(nextButton, {'data-controls' : 'next'});
          }

          prevIsButton = isButton(prevButton);
          nextIsButton = isButton(nextButton);

          updateControlsStatus();

          // add events
          if (controlsContainer) {
            addEvents(controlsContainer, controlsEvents);
          } else {
            addEvents(prevButton, controlsEvents);
            addEvents(nextButton, controlsEvents);
          }
        }

        // hide tools if needed
        disableUI();
      }

      function initEvents () {
        // add events
        if (carousel && TRANSITIONEND) {
          var eve = {};
          eve[TRANSITIONEND] = onTransitionEnd;
          addEvents(container, eve);
        }

        if (touch) { addEvents(container, touchEvents, options.preventScrollOnTouch); }
        if (mouseDrag) { addEvents(container, dragEvents); }
        if (arrowKeys) { addEvents(doc, docmentKeydownEvent); }

        if (nested === 'inner') {
          events.on('outerResized', function () {
            resizeTasks();
            events.emit('innerLoaded', info());
          });
        } else if (responsive || fixedWidth || autoWidth || autoHeight || !horizontal) {
          addEvents(win, {'resize': onResize});
        }

        if (autoHeight) {
          if (nested === 'outer') {
            events.on('innerLoaded', doAutoHeight);
          } else if (!disable) { doAutoHeight(); }
        }

        doLazyLoad();
        if (disable) { disableSlider(); } else if (freeze) { freezeSlider(); }

        events.on('indexChanged', additionalUpdates);
        if (nested === 'inner') { events.emit('innerLoaded', info()); }
        if (typeof onInit === 'function') { onInit(info()); }
        isOn = true;
      }

      function destroy () {
        // sheet
        sheet.disabled = true;
        if (sheet.ownerNode) { sheet.ownerNode.remove(); }

        // remove win event listeners
        removeEvents(win, {'resize': onResize});

        // arrowKeys, controls, nav
        if (arrowKeys) { removeEvents(doc, docmentKeydownEvent); }
        if (controlsContainer) { removeEvents(controlsContainer, controlsEvents); }
        if (navContainer) { removeEvents(navContainer, navEvents); }

        // autoplay
        removeEvents(container, hoverEvents);
        removeEvents(container, visibilityEvent);
        if (autoplayButton) { removeEvents(autoplayButton, {'click': toggleAutoplay}); }
        if (autoplay) { clearInterval(autoplayTimer); }

        // container
        if (carousel && TRANSITIONEND) {
          var eve = {};
          eve[TRANSITIONEND] = onTransitionEnd;
          removeEvents(container, eve);
        }
        if (touch) { removeEvents(container, touchEvents); }
        if (mouseDrag) { removeEvents(container, dragEvents); }

        // cache Object values in options && reset HTML
        var htmlList = [containerHTML, controlsContainerHTML, prevButtonHTML, nextButtonHTML, navContainerHTML, autoplayButtonHTML];

        tnsList.forEach(function(item, i) {
          var el = item === 'container' ? outerWrapper : options[item];

          if (typeof el === 'object') {
            var prevEl = el.previousElementSibling ? el.previousElementSibling : false,
                parentEl = el.parentNode;
            el.outerHTML = htmlList[i];
            options[item] = prevEl ? prevEl.nextElementSibling : parentEl.firstElementChild;
          }
        });


        // reset variables
        tnsList = animateIn = animateOut = animateDelay = animateNormal = horizontal = outerWrapper = innerWrapper = container = containerParent = containerHTML = slideItems = slideCount = breakpointZone = windowWidth = autoWidth = fixedWidth = edgePadding = gutter = viewport = items = slideBy = viewportMax = arrowKeys = speed = rewind = loop = autoHeight = sheet = lazyload = slidePositions = slideItemsOut = cloneCount = slideCountNew = hasRightDeadZone = rightBoundary = updateIndexBeforeTransform = transformAttr = transformPrefix = transformPostfix = getIndexMax = index = indexCached = indexMin = indexMax = resizeTimer = swipeAngle = moveDirectionExpected = running = onInit = events = newContainerClasses = slideId = disable = disabled = freezable = freeze = frozen = controlsEvents = navEvents = hoverEvents = visibilityEvent = docmentKeydownEvent = touchEvents = dragEvents = hasControls = hasNav = navAsThumbnails = hasAutoplay = hasTouch = hasMouseDrag = slideActiveClass = imgCompleteClass = imgEvents = imgsComplete = controls = controlsText = controlsContainer = controlsContainerHTML = prevButton = nextButton = prevIsButton = nextIsButton = nav = navContainer = navContainerHTML = navItems = pages = pagesCached = navClicked = navCurrentIndex = navCurrentIndexCached = navActiveClass = navStr = navStrCurrent = autoplay = autoplayTimeout = autoplayDirection = autoplayText = autoplayHoverPause = autoplayButton = autoplayButtonHTML = autoplayResetOnVisibility = autoplayHtmlStrings = autoplayTimer = animating = autoplayHoverPaused = autoplayUserPaused = autoplayVisibilityPaused = initPosition = lastPosition = translateInit = disX = disY = panStart = rafIndex = getDist = touch = mouseDrag = null;
        // check variables
        // [animateIn, animateOut, animateDelay, animateNormal, horizontal, outerWrapper, innerWrapper, container, containerParent, containerHTML, slideItems, slideCount, breakpointZone, windowWidth, autoWidth, fixedWidth, edgePadding, gutter, viewport, items, slideBy, viewportMax, arrowKeys, speed, rewind, loop, autoHeight, sheet, lazyload, slidePositions, slideItemsOut, cloneCount, slideCountNew, hasRightDeadZone, rightBoundary, updateIndexBeforeTransform, transformAttr, transformPrefix, transformPostfix, getIndexMax, index, indexCached, indexMin, indexMax, resizeTimer, swipeAngle, moveDirectionExpected, running, onInit, events, newContainerClasses, slideId, disable, disabled, freezable, freeze, frozen, controlsEvents, navEvents, hoverEvents, visibilityEvent, docmentKeydownEvent, touchEvents, dragEvents, hasControls, hasNav, navAsThumbnails, hasAutoplay, hasTouch, hasMouseDrag, slideActiveClass, imgCompleteClass, imgEvents, imgsComplete, controls, controlsText, controlsContainer, controlsContainerHTML, prevButton, nextButton, prevIsButton, nextIsButton, nav, navContainer, navContainerHTML, navItems, pages, pagesCached, navClicked, navCurrentIndex, navCurrentIndexCached, navActiveClass, navStr, navStrCurrent, autoplay, autoplayTimeout, autoplayDirection, autoplayText, autoplayHoverPause, autoplayButton, autoplayButtonHTML, autoplayResetOnVisibility, autoplayHtmlStrings, autoplayTimer, animating, autoplayHoverPaused, autoplayUserPaused, autoplayVisibilityPaused, initPosition, lastPosition, translateInit, disX, disY, panStart, rafIndex, getDist, touch, mouseDrag ].forEach(function(item) { if (item !== null) { console.log(item); } });

        for (var a in this) {
          if (a !== 'rebuild') { this[a] = null; }
        }
        isOn = false;
      }

    // === ON RESIZE ===
      // responsive || fixedWidth || autoWidth || !horizontal
      function onResize (e) {
        raf$1(function(){ resizeTasks(getEvent(e)); });
      }

      function resizeTasks (e) {
        if (!isOn) { return; }
        if (nested === 'outer') { events.emit('outerResized', info(e)); }
        windowWidth = getWindowWidth();
        var bpChanged,
            breakpointZoneTem = breakpointZone,
            needContainerTransform = false;

        if (responsive) {
          setBreakpointZone();
          bpChanged = breakpointZoneTem !== breakpointZone;
          // if (hasRightDeadZone) { needContainerTransform = true; } // *?
          if (bpChanged) { events.emit('newBreakpointStart', info(e)); }
        }

        var indChanged,
            itemsChanged,
            itemsTem = items,
            disableTem = disable,
            freezeTem = freeze,
            arrowKeysTem = arrowKeys,
            controlsTem = controls,
            navTem = nav,
            touchTem = touch,
            mouseDragTem = mouseDrag,
            autoplayTem = autoplay,
            autoplayHoverPauseTem = autoplayHoverPause,
            autoplayResetOnVisibilityTem = autoplayResetOnVisibility,
            indexTem = index;

        if (bpChanged) {
          var fixedWidthTem = fixedWidth,
              autoHeightTem = autoHeight,
              controlsTextTem = controlsText,
              centerTem = center,
              autoplayTextTem = autoplayText;

          if (!CSSMQ) {
            var gutterTem = gutter,
                edgePaddingTem = edgePadding;
          }
        }

        // get option:
        // fixed width: viewport, fixedWidth, gutter => items
        // others: window width => all variables
        // all: items => slideBy
        arrowKeys = getOption('arrowKeys');
        controls = getOption('controls');
        nav = getOption('nav');
        touch = getOption('touch');
        center = getOption('center');
        mouseDrag = getOption('mouseDrag');
        autoplay = getOption('autoplay');
        autoplayHoverPause = getOption('autoplayHoverPause');
        autoplayResetOnVisibility = getOption('autoplayResetOnVisibility');

        if (bpChanged) {
          disable = getOption('disable');
          fixedWidth = getOption('fixedWidth');
          speed = getOption('speed');
          autoHeight = getOption('autoHeight');
          controlsText = getOption('controlsText');
          autoplayText = getOption('autoplayText');
          autoplayTimeout = getOption('autoplayTimeout');

          if (!CSSMQ) {
            edgePadding = getOption('edgePadding');
            gutter = getOption('gutter');
          }
        }
        // update options
        resetVariblesWhenDisable(disable);

        viewport = getViewportWidth(); // <= edgePadding, gutter
        if ((!horizontal || autoWidth) && !disable) {
          setSlidePositions();
          if (!horizontal) {
            updateContentWrapperHeight(); // <= setSlidePositions
            needContainerTransform = true;
          }
        }
        if (fixedWidth || autoWidth) {
          rightBoundary = getRightBoundary(); // autoWidth: <= viewport, slidePositions, gutter
                                              // fixedWidth: <= viewport, fixedWidth, gutter
          indexMax = getIndexMax(); // autoWidth: <= rightBoundary, slidePositions
                                    // fixedWidth: <= rightBoundary, fixedWidth, gutter
        }

        if (bpChanged || fixedWidth) {
          items = getOption('items');
          slideBy = getOption('slideBy');
          itemsChanged = items !== itemsTem;

          if (itemsChanged) {
            if (!fixedWidth && !autoWidth) { indexMax = getIndexMax(); } // <= items
            // check index before transform in case
            // slider reach the right edge then items become bigger
            updateIndex();
          }
        }
        
        if (bpChanged) {
          if (disable !== disableTem) {
            if (disable) {
              disableSlider();
            } else {
              enableSlider(); // <= slidePositions, rightBoundary, indexMax
            }
          }
        }

        if (freezable && (bpChanged || fixedWidth || autoWidth)) {
          freeze = getFreeze(); // <= autoWidth: slidePositions, gutter, viewport, rightBoundary
                                // <= fixedWidth: fixedWidth, gutter, rightBoundary
                                // <= others: items

          if (freeze !== freezeTem) {
            if (freeze) {
              doContainerTransform(getContainerTransformValue(getStartIndex(0)));
              freezeSlider();
            } else {
              unfreezeSlider();
              needContainerTransform = true;
            }
          }
        }

        resetVariblesWhenDisable(disable || freeze); // controls, nav, touch, mouseDrag, arrowKeys, autoplay, autoplayHoverPause, autoplayResetOnVisibility
        if (!autoplay) { autoplayHoverPause = autoplayResetOnVisibility = false; }

        if (arrowKeys !== arrowKeysTem) {
          arrowKeys ?
            addEvents(doc, docmentKeydownEvent) :
            removeEvents(doc, docmentKeydownEvent);
        }
        if (controls !== controlsTem) {
          if (controls) {
            if (controlsContainer) {
              showElement(controlsContainer);
            } else {
              if (prevButton) { showElement(prevButton); }
              if (nextButton) { showElement(nextButton); }
            }
          } else {
            if (controlsContainer) {
              hideElement(controlsContainer);
            } else {
              if (prevButton) { hideElement(prevButton); }
              if (nextButton) { hideElement(nextButton); }
            }
          }
        }
        if (nav !== navTem) {
          nav ?
            showElement(navContainer) :
            hideElement(navContainer);
        }
        if (touch !== touchTem) {
          touch ?
            addEvents(container, touchEvents, options.preventScrollOnTouch) :
            removeEvents(container, touchEvents);
        }
        if (mouseDrag !== mouseDragTem) {
          mouseDrag ?
            addEvents(container, dragEvents) :
            removeEvents(container, dragEvents);
        }
        if (autoplay !== autoplayTem) {
          if (autoplay) {
            if (autoplayButton) { showElement(autoplayButton); }
            if (!animating && !autoplayUserPaused) { startAutoplay(); }
          } else {
            if (autoplayButton) { hideElement(autoplayButton); }
            if (animating) { stopAutoplay(); }
          }
        }
        if (autoplayHoverPause !== autoplayHoverPauseTem) {
          autoplayHoverPause ?
            addEvents(container, hoverEvents) :
            removeEvents(container, hoverEvents);
        }
        if (autoplayResetOnVisibility !== autoplayResetOnVisibilityTem) {
          autoplayResetOnVisibility ?
            addEvents(doc, visibilityEvent) :
            removeEvents(doc, visibilityEvent);
        }

        if (bpChanged) {
          if (fixedWidth !== fixedWidthTem || center !== centerTem) { needContainerTransform = true; }

          if (autoHeight !== autoHeightTem) {
            if (!autoHeight) { innerWrapper.style.height = ''; }
          }

          if (controls && controlsText !== controlsTextTem) {
            prevButton.innerHTML = controlsText[0];
            nextButton.innerHTML = controlsText[1];
          }

          if (autoplayButton && autoplayText !== autoplayTextTem) {
            var i = autoplay ? 1 : 0,
                html = autoplayButton.innerHTML,
                len = html.length - autoplayTextTem[i].length;
            if (html.substring(len) === autoplayTextTem[i]) {
              autoplayButton.innerHTML = html.substring(0, len) + autoplayText[i];
            }
          }
        } else {
          if (center && (fixedWidth || autoWidth)) { needContainerTransform = true; }
        }

        if (itemsChanged || fixedWidth && !autoWidth) {
          pages = getPages();
          updateNavVisibility();
        }

        indChanged = index !== indexTem;
        if (indChanged) { 
          events.emit('indexChanged', info());
          needContainerTransform = true;
        } else if (itemsChanged) {
          if (!indChanged) { additionalUpdates(); }
        } else if (fixedWidth || autoWidth) {
          doLazyLoad(); 
          updateSlideStatus();
          updateLiveRegion();
        }

        if (itemsChanged && !carousel) { updateGallerySlidePositions(); }

        if (!disable && !freeze) {
          // non-meduaqueries: IE8
          if (bpChanged && !CSSMQ) {
            // middle wrapper styles
            if (autoHeight !== autoheightTem || speed !== speedTem) {
              update_carousel_transition_duration();
            }

            // inner wrapper styles
            if (edgePadding !== edgePaddingTem || gutter !== gutterTem) {
              innerWrapper.style.cssText = getInnerWrapperStyles(edgePadding, gutter, fixedWidth, speed, autoHeight);
            }

            if (horizontal) {
              // container styles
              if (carousel) {
                container.style.width = getContainerWidth(fixedWidth, gutter, items);
              }

              // slide styles
              var str = getSlideWidthStyle(fixedWidth, gutter, items) + 
                        getSlideGutterStyle(gutter);

              // remove the last line and
              // add new styles
              removeCSSRule(sheet, getCssRulesLength(sheet) - 1);
              addCSSRule(sheet, '#' + slideId + ' > .tns-item', str, getCssRulesLength(sheet));
            }
          }

          // auto height
          if (autoHeight) { doAutoHeight(); }

          if (needContainerTransform) {
            doContainerTransformSilent();
            indexCached = index;
          }
        }

        if (bpChanged) { events.emit('newBreakpointEnd', info(e)); }
      }





      // === INITIALIZATION FUNCTIONS === //
      function getFreeze () {
        if (!fixedWidth && !autoWidth) {
          var a = center ? items - (items - 1) / 2 : items;
          return  slideCount <= a;
        }

        var width = fixedWidth ? (fixedWidth + gutter) * slideCount : slidePositions[slideCount],
            vp = edgePadding ? viewport + edgePadding * 2 : viewport + gutter;

        if (center) {
          vp -= fixedWidth ? (viewport - fixedWidth) / 2 : (viewport - (slidePositions[index + 1] - slidePositions[index] - gutter)) / 2;
        }

        return width <= vp;
      }

      function setBreakpointZone () {
        breakpointZone = 0;
        for (var bp in responsive) {
          bp = parseInt(bp); // convert string to number
          if (windowWidth >= bp) { breakpointZone = bp; }
        }
      }

      // (slideBy, indexMin, indexMax) => index
      var updateIndex = (function () {
        return loop ? 
          carousel ?
            // loop + carousel
            function () {
              var leftEdge = indexMin,
                  rightEdge = indexMax;

              leftEdge += slideBy;
              rightEdge -= slideBy;

              // adjust edges when has edge paddings
              // or fixed-width slider with extra space on the right side
              if (edgePadding) {
                leftEdge += 1;
                rightEdge -= 1;
              } else if (fixedWidth) {
                if ((viewport + gutter)%(fixedWidth + gutter)) { rightEdge -= 1; }
              }

              if (cloneCount) {
                if (index > rightEdge) {
                  index -= slideCount;
                } else if (index < leftEdge) {
                  index += slideCount;
                }
              }
            } :
            // loop + gallery
            function() {
              if (index > indexMax) {
                while (index >= indexMin + slideCount) { index -= slideCount; }
              } else if (index < indexMin) {
                while (index <= indexMax - slideCount) { index += slideCount; }
              }
            } :
          // non-loop
          function() {
            index = Math.max(indexMin, Math.min(indexMax, index));
          };
      })();

      function disableUI () {
        if (!autoplay && autoplayButton) { hideElement(autoplayButton); }
        if (!nav && navContainer) { hideElement(navContainer); }
        if (!controls) {
          if (controlsContainer) {
            hideElement(controlsContainer);
          } else {
            if (prevButton) { hideElement(prevButton); }
            if (nextButton) { hideElement(nextButton); }
          }
        }
      }

      function enableUI () {
        if (autoplay && autoplayButton) { showElement(autoplayButton); }
        if (nav && navContainer) { showElement(navContainer); }
        if (controls) {
          if (controlsContainer) {
            showElement(controlsContainer);
          } else {
            if (prevButton) { showElement(prevButton); }
            if (nextButton) { showElement(nextButton); }
          }
        }
      }

      function freezeSlider () {
        if (frozen) { return; }

        // remove edge padding from inner wrapper
        if (edgePadding) { innerWrapper.style.margin = '0px'; }

        // add class tns-transparent to cloned slides
        if (cloneCount) {
          var str = 'tns-transparent';
          for (var i = cloneCount; i--;) {
            if (carousel) { addClass(slideItems[i], str); }
            addClass(slideItems[slideCountNew - i - 1], str);
          }
        }

        // update tools
        disableUI();

        frozen = true;
      }

      function unfreezeSlider () {
        if (!frozen) { return; }

        // restore edge padding for inner wrapper
        // for mordern browsers
        if (edgePadding && CSSMQ) { innerWrapper.style.margin = ''; }

        // remove class tns-transparent to cloned slides
        if (cloneCount) {
          var str = 'tns-transparent';
          for (var i = cloneCount; i--;) {
            if (carousel) { removeClass(slideItems[i], str); }
            removeClass(slideItems[slideCountNew - i - 1], str);
          }
        }

        // update tools
        enableUI();

        frozen = false;
      }

      function disableSlider () {
        if (disabled) { return; }

        sheet.disabled = true;
        container.className = container.className.replace(newContainerClasses.substring(1), '');
        removeAttrs(container, ['style']);
        if (loop) {
          for (var j = cloneCount; j--;) {
            if (carousel) { hideElement(slideItems[j]); }
            hideElement(slideItems[slideCountNew - j - 1]);
          }
        }

        // vertical slider
        if (!horizontal || !carousel) { removeAttrs(innerWrapper, ['style']); }

        // gallery
        if (!carousel) { 
          for (var i = index, l = index + slideCount; i < l; i++) {
            var item = slideItems[i];
            removeAttrs(item, ['style']);
            removeClass(item, animateIn);
            removeClass(item, animateNormal);
          }
        }

        // update tools
        disableUI();

        disabled = true;
      }

      function enableSlider () {
        if (!disabled) { return; }

        sheet.disabled = false;
        container.className += newContainerClasses;
        doContainerTransformSilent();

        if (loop) {
          for (var j = cloneCount; j--;) {
            if (carousel) { showElement(slideItems[j]); }
            showElement(slideItems[slideCountNew - j - 1]);
          }
        }

        // gallery
        if (!carousel) { 
          for (var i = index, l = index + slideCount; i < l; i++) {
            var item = slideItems[i],
                classN = i < index + items ? animateIn : animateNormal;
            item.style.left = (i - index) * 100 / items + '%';
            addClass(item, classN);
          }
        }

        // update tools
        enableUI();

        disabled = false;
      }

      function updateLiveRegion () {
        var str = getLiveRegionStr();
        if (liveregionCurrent.innerHTML !== str) { liveregionCurrent.innerHTML = str; }
      }

      function getLiveRegionStr () {
        var arr = getVisibleSlideRange(),
            start = arr[0] + 1,
            end = arr[1] + 1;
        return start === end ? start + '' : start + ' to ' + end; 
      }

      function getVisibleSlideRange (val) {
        if (val == null) { val = getContainerTransformValue(); }
        var start = index, end, rangestart, rangeend;

        // get range start, range end for autoWidth and fixedWidth
        if (center || edgePadding) {
          if (autoWidth || fixedWidth) {
            rangestart = - (parseFloat(val) + edgePadding);
            rangeend = rangestart + viewport + edgePadding * 2;
          }
        } else {
          if (autoWidth) {
            rangestart = slidePositions[index];
            rangeend = rangestart + viewport;
          }
        }

        // get start, end
        // - check auto width
        if (autoWidth) {
          slidePositions.forEach(function(point, i) {
            if (i < slideCountNew) {
              if ((center || edgePadding) && point <= rangestart + 0.5) { start = i; }
              if (rangeend - point >= 0.5) { end = i; }
            }
          });

        // - check percentage width, fixed width
        } else {

          if (fixedWidth) {
            var cell = fixedWidth + gutter;
            if (center || edgePadding) {
              start = Math.floor(rangestart/cell);
              end = Math.ceil(rangeend/cell - 1);
            } else {
              end = start + Math.ceil(viewport/cell) - 1;
            }

          } else {
            if (center || edgePadding) {
              var a = items - 1;
              if (center) {
                start -= a / 2;
                end = index + a / 2;
              } else {
                end = index + a;
              }

              if (edgePadding) {
                var b = edgePadding * items / viewport;
                start -= b;
                end += b;
              }

              start = Math.floor(start);
              end = Math.ceil(end);
            } else {
              end = start + items - 1;
            }
          }

          start = Math.max(start, 0);
          end = Math.min(end, slideCountNew - 1);
        }

        return [start, end];
      }

      function doLazyLoad () {
        if (lazyload && !disable) {
          getImageArray.apply(null, getVisibleSlideRange()).forEach(function (img) {
            if (!hasClass(img, imgCompleteClass)) {
              // stop propagation transitionend event to container
              var eve = {};
              eve[TRANSITIONEND] = function (e) { e.stopPropagation(); };
              addEvents(img, eve);

              addEvents(img, imgEvents);

              // update src
              img.src = getAttr(img, 'data-src');

              // update srcset
              var srcset = getAttr(img, 'data-srcset');
              if (srcset) { img.srcset = srcset; }

              addClass(img, 'loading');
            }
          });
        }
      }

      function onImgLoaded (e) {
        imgLoaded(getTarget(e));
      }

      function onImgFailed (e) {
        imgFailed(getTarget(e));
      }

      function imgLoaded (img) {
        addClass(img, 'loaded');
        imgCompleted(img);
      }

      function imgFailed (img) {
        addClass(img, 'failed');
        imgCompleted(img);
      }

      function imgCompleted (img) {
        addClass(img, 'tns-complete');
        removeClass(img, 'loading');
        removeEvents(img, imgEvents);
      }

      function getImageArray (start, end) {
        var imgs = [];
        while (start <= end) {
          forEach(slideItems[start].querySelectorAll('img'), function (img) { imgs.push(img); });
          start++;
        }

        return imgs;
      }

      // check if all visible images are loaded
      // and update container height if it's done
      function doAutoHeight () {
        var imgs = getImageArray.apply(null, getVisibleSlideRange());
        raf$1(function(){ imgsLoadedCheck(imgs, updateInnerWrapperHeight); });
      }

      function imgsLoadedCheck (imgs, cb) {
        // directly execute callback function if all images are complete
        if (imgsComplete) { return cb(); }

        // check selected image classes otherwise
        imgs.forEach(function (img, index) {
          if (hasClass(img, imgCompleteClass)) { imgs.splice(index, 1); }
        });

        // execute callback function if selected images are all complete
        if (!imgs.length) { return cb(); }

        // otherwise execute this functiona again
        raf$1(function(){ imgsLoadedCheck(imgs, cb); });
      } 

      function additionalUpdates () {
        doLazyLoad(); 
        updateSlideStatus();
        updateLiveRegion();
        updateControlsStatus();
        updateNavStatus();
      }


      function update_carousel_transition_duration () {
        if (carousel && autoHeight) {
          middleWrapper.style[TRANSITIONDURATION] = speed / 1000 + 's';
        }
      }

      function getMaxSlideHeight (slideStart, slideRange) {
        var heights = [];
        for (var i = slideStart, l = Math.min(slideStart + slideRange, slideCountNew); i < l; i++) {
          heights.push(slideItems[i].offsetHeight);
        }

        return Math.max.apply(null, heights);
      }

      // update inner wrapper height
      // 1. get the max-height of the visible slides
      // 2. set transitionDuration to speed
      // 3. update inner wrapper height to max-height
      // 4. set transitionDuration to 0s after transition done
      function updateInnerWrapperHeight () {
        var maxHeight = autoHeight ? getMaxSlideHeight(index, items) : getMaxSlideHeight(cloneCount, slideCount),
            wp = middleWrapper ? middleWrapper : innerWrapper;

        if (wp.style.height !== maxHeight) { wp.style.height = maxHeight + 'px'; }
      }

      // get the distance from the top edge of the first slide to each slide
      // (init) => slidePositions
      function setSlidePositions () {
        slidePositions = [0];
        var attr = horizontal ? 'left' : 'top',
            attr2 = horizontal ? 'right' : 'bottom',
            base = slideItems[0].getBoundingClientRect()[attr];

        forEach(slideItems, function(item, i) {
          // skip the first slide
          if (i) { slidePositions.push(item.getBoundingClientRect()[attr] - base); }
          // add the end edge
          if (i === slideCountNew - 1) { slidePositions.push(item.getBoundingClientRect()[attr2] - base); }
        });
      }

      // update slide
      function updateSlideStatus () {
        var range = getVisibleSlideRange(),
            start = range[0],
            end = range[1];

        forEach(slideItems, function(item, i) {
          // show slides
          if (i >= start && i <= end) {
            if (hasAttr(item, 'aria-hidden')) {
              removeAttrs(item, ['aria-hidden', 'tabindex']);
              addClass(item, slideActiveClass);
            }
          // hide slides
          } else {
            if (!hasAttr(item, 'aria-hidden')) {
              setAttrs(item, {
                'aria-hidden': 'true',
                'tabindex': '-1'
              });
              removeClass(item, slideActiveClass);
            }
          }
        });
      }

      // gallery: update slide position
      function updateGallerySlidePositions () {
        var l = index + Math.min(slideCount, items);
        for (var i = slideCountNew; i--;) {
          var item = slideItems[i];

          if (i >= index && i < l) {
            // add transitions to visible slides when adjusting their positions
            addClass(item, 'tns-moving');

            item.style.left = (i - index) * 100 / items + '%';
            addClass(item, animateIn);
            removeClass(item, animateNormal);
          } else if (item.style.left) {
            item.style.left = '';
            addClass(item, animateNormal);
            removeClass(item, animateIn);
          }

          // remove outlet animation
          removeClass(item, animateOut);
        }

        // removing '.tns-moving'
        setTimeout(function() {
          forEach(slideItems, function(el) {
            removeClass(el, 'tns-moving');
          });
        }, 300);
      }

      // set tabindex on Nav
      function updateNavStatus () {
        // get current nav
        if (nav) {
          navCurrentIndex = navClicked >= 0 ? navClicked : getCurrentNavIndex();
          navClicked = -1;

          if (navCurrentIndex !== navCurrentIndexCached) {
            var navPrev = navItems[navCurrentIndexCached],
                navCurrent = navItems[navCurrentIndex];

            setAttrs(navPrev, {
              'tabindex': '-1',
              'aria-label': navStr + (navCurrentIndexCached + 1)
            });
            removeClass(navPrev, navActiveClass);
            
            setAttrs(navCurrent, {'aria-label': navStr + (navCurrentIndex + 1) + navStrCurrent});
            removeAttrs(navCurrent, 'tabindex');
            addClass(navCurrent, navActiveClass);

            navCurrentIndexCached = navCurrentIndex;
          }
        }
      }

      function getLowerCaseNodeName (el) {
        return el.nodeName.toLowerCase();
      }

      function isButton (el) {
        return getLowerCaseNodeName(el) === 'button';
      }

      function isAriaDisabled (el) {
        return el.getAttribute('aria-disabled') === 'true';
      }

      function disEnableElement (isButton, el, val) {
        if (isButton) {
          el.disabled = val;
        } else {
          el.setAttribute('aria-disabled', val.toString());
        }
      }

      // set 'disabled' to true on controls when reach the edges
      function updateControlsStatus () {
        if (!controls || rewind || loop) { return; }

        var prevDisabled = (prevIsButton) ? prevButton.disabled : isAriaDisabled(prevButton),
            nextDisabled = (nextIsButton) ? nextButton.disabled : isAriaDisabled(nextButton),
            disablePrev = (index <= indexMin) ? true : false,
            disableNext = (!rewind && index >= indexMax) ? true : false;

        if (disablePrev && !prevDisabled) {
          disEnableElement(prevIsButton, prevButton, true);
        }
        if (!disablePrev && prevDisabled) {
          disEnableElement(prevIsButton, prevButton, false);
        }
        if (disableNext && !nextDisabled) {
          disEnableElement(nextIsButton, nextButton, true);
        }
        if (!disableNext && nextDisabled) {
          disEnableElement(nextIsButton, nextButton, false);
        }
      }

      // set duration
      function resetDuration (el, str) {
        if (TRANSITIONDURATION) { el.style[TRANSITIONDURATION] = str; }
      }

      function getSliderWidth () {
        return fixedWidth ? (fixedWidth + gutter) * slideCountNew : slidePositions[slideCountNew];
      }

      function getCenterGap (num) {
        if (num == null) { num = index; }

        var gap = edgePadding ? gutter : 0;
        return autoWidth ? ((viewport - gap) - (slidePositions[num + 1] - slidePositions[num] - gutter))/2 :
          fixedWidth ? (viewport - fixedWidth) / 2 :
            (items - 1) / 2;
      }

      function getRightBoundary () {
        var gap = edgePadding ? gutter : 0,
            result = (viewport + gap) - getSliderWidth();

        if (center && !loop) {
          result = fixedWidth ? - (fixedWidth + gutter) * (slideCountNew - 1) - getCenterGap() :
            getCenterGap(slideCountNew - 1) - slidePositions[slideCountNew - 1];
        }
        if (result > 0) { result = 0; }

        return result;
      }

      function getContainerTransformValue (num) {
        if (num == null) { num = index; }

        var val;
        if (horizontal && !autoWidth) {
          if (fixedWidth) {
            val = - (fixedWidth + gutter) * num;
            if (center) { val += getCenterGap(); }
          } else {
            var denominator = TRANSFORM ? slideCountNew : items;
            if (center) { num -= getCenterGap(); }
            val = - num * 100 / denominator;
          }
        } else {
          val = - slidePositions[num];
          if (center && autoWidth) {
            val += getCenterGap();
          }
        }

        if (hasRightDeadZone) { val = Math.max(val, rightBoundary); }

        val += (horizontal && !autoWidth && !fixedWidth) ? '%' : 'px';

        return val;
      }

      function doContainerTransformSilent (val) {
        resetDuration(container, '0s');
        doContainerTransform(val);
      }

      function doContainerTransform (val) {
        if (val == null) { val = getContainerTransformValue(); }
        container.style[transformAttr] = transformPrefix + val + transformPostfix;
      }

      function animateSlide (number, classOut, classIn, isOut) {
        var l = number + items;
        if (!loop) { l = Math.min(l, slideCountNew); }

        for (var i = number; i < l; i++) {
            var item = slideItems[i];

          // set item positions
          if (!isOut) { item.style.left = (i - index) * 100 / items + '%'; }

          if (animateDelay && TRANSITIONDELAY) {
            item.style[TRANSITIONDELAY] = item.style[ANIMATIONDELAY] = animateDelay * (i - number) / 1000 + 's';
          }
          removeClass(item, classOut);
          addClass(item, classIn);
          
          if (isOut) { slideItemsOut.push(item); }
        }
      }

      // make transfer after click/drag:
      // 1. change 'transform' property for mordern browsers
      // 2. change 'left' property for legacy browsers
      var transformCore = (function () {
        return carousel ?
          function () {
            resetDuration(container, '');
            if (TRANSITIONDURATION || !speed) {
              // for morden browsers with non-zero duration or 
              // zero duration for all browsers
              doContainerTransform();
              // run fallback function manually 
              // when duration is 0 / container is hidden
              if (!speed || !isVisible(container)) { onTransitionEnd(); }

            } else {
              // for old browser with non-zero duration
              jsTransform(container, transformAttr, transformPrefix, transformPostfix, getContainerTransformValue(), speed, onTransitionEnd);
            }

            if (!horizontal) { updateContentWrapperHeight(); }
          } :
          function () {
            slideItemsOut = [];

            var eve = {};
            eve[TRANSITIONEND] = eve[ANIMATIONEND] = onTransitionEnd;
            removeEvents(slideItems[indexCached], eve);
            addEvents(slideItems[index], eve);

            animateSlide(indexCached, animateIn, animateOut, true);
            animateSlide(index, animateNormal, animateIn);

            // run fallback function manually 
            // when transition or animation not supported / duration is 0
            if (!TRANSITIONEND || !ANIMATIONEND || !speed || !isVisible(container)) { onTransitionEnd(); }
          };
      })();

      function render (e, sliderMoved) {
        if (updateIndexBeforeTransform) { updateIndex(); }

        // render when slider was moved (touch or drag) even though index may not change
        if (index !== indexCached || sliderMoved) {
          // events
          events.emit('indexChanged', info());
          events.emit('transitionStart', info());
          if (autoHeight) { doAutoHeight(); }

          // pause autoplay when click or keydown from user
          if (animating && e && ['click', 'keydown'].indexOf(e.type) >= 0) { stopAutoplay(); }

          running = true;
          transformCore();
        }
      }

      /*
       * Transfer prefixed properties to the same format
       * CSS: -Webkit-Transform => webkittransform
       * JS: WebkitTransform => webkittransform
       * @param {string} str - property
       *
       */
      function strTrans (str) {
        return str.toLowerCase().replace(/-/g, '');
      }

      // AFTER TRANSFORM
      // Things need to be done after a transfer:
      // 1. check index
      // 2. add classes to visible slide
      // 3. disable controls buttons when reach the first/last slide in non-loop slider
      // 4. update nav status
      // 5. lazyload images
      // 6. update container height
      function onTransitionEnd (event) {
        // check running on gallery mode
        // make sure trantionend/animationend events run only once
        if (carousel || running) {
          events.emit('transitionEnd', info(event));

          if (!carousel && slideItemsOut.length > 0) {
            for (var i = 0; i < slideItemsOut.length; i++) {
              var item = slideItemsOut[i];
              // set item positions
              item.style.left = '';

              if (ANIMATIONDELAY && TRANSITIONDELAY) { 
                item.style[ANIMATIONDELAY] = '';
                item.style[TRANSITIONDELAY] = '';
              }
              removeClass(item, animateOut);
              addClass(item, animateNormal);
            }
          }

          /* update slides, nav, controls after checking ...
           * => legacy browsers who don't support 'event' 
           *    have to check event first, otherwise event.target will cause an error 
           * => or 'gallery' mode: 
           *   + event target is slide item
           * => or 'carousel' mode: 
           *   + event target is container, 
           *   + event.property is the same with transform attribute
           */
          if (!event || 
              !carousel && event.target.parentNode === container || 
              event.target === container && strTrans(event.propertyName) === strTrans(transformAttr)) {

            if (!updateIndexBeforeTransform) { 
              var indexTem = index;
              updateIndex();
              if (index !== indexTem) { 
                events.emit('indexChanged', info());

                doContainerTransformSilent();
              }
            } 

            if (nested === 'inner') { events.emit('innerLoaded', info()); }
            running = false;
            indexCached = index;
          }
        }

      }

      // # ACTIONS
      function goTo (targetIndex, e) {
        if (freeze) { return; }

        // prev slideBy
        if (targetIndex === 'prev') {
          onControlsClick(e, -1);

        // next slideBy
        } else if (targetIndex === 'next') {
          onControlsClick(e, 1);

        // go to exact slide
        } else {
          if (running) {
            if (preventActionWhenRunning) { return; } else { onTransitionEnd(); }
          }

          var absIndex = getAbsIndex(), 
              indexGap = 0;

          if (targetIndex === 'first') {
            indexGap = - absIndex;
          } else if (targetIndex === 'last') {
            indexGap = carousel ? slideCount - items - absIndex : slideCount - 1 - absIndex;
          } else {
            if (typeof targetIndex !== 'number') { targetIndex = parseInt(targetIndex); }

            if (!isNaN(targetIndex)) {
              // from directly called goTo function
              if (!e) { targetIndex = Math.max(0, Math.min(slideCount - 1, targetIndex)); }

              indexGap = targetIndex - absIndex;
            }
          }

          // gallery: make sure new page won't overlap with current page
          if (!carousel && indexGap && Math.abs(indexGap) < items) {
            var factor = indexGap > 0 ? 1 : -1;
            indexGap += (index + indexGap - slideCount) >= indexMin ? slideCount * factor : slideCount * 2 * factor * -1;
          }

          index += indexGap;

          // make sure index is in range
          if (carousel && loop) {
            if (index < indexMin) { index += slideCount; }
            if (index > indexMax) { index -= slideCount; }
          }

          // if index is changed, start rendering
          if (getAbsIndex(index) !== getAbsIndex(indexCached)) {
            render(e);
          }

        }
      }

      // on controls click
      function onControlsClick (e, dir) {
        if (running) {
          if (preventActionWhenRunning) { return; } else { onTransitionEnd(); }
        }
        var passEventObject;

        if (!dir) {
          e = getEvent(e);
          var target = getTarget(e);

          while (target !== controlsContainer && [prevButton, nextButton].indexOf(target) < 0) { target = target.parentNode; }

          var targetIn = [prevButton, nextButton].indexOf(target);
          if (targetIn >= 0) {
            passEventObject = true;
            dir = targetIn === 0 ? -1 : 1;
          }
        }

        if (rewind) {
          if (index === indexMin && dir === -1) {
            goTo('last', e);
            return;
          } else if (index === indexMax && dir === 1) {
            goTo('first', e);
            return;
          }
        }

        if (dir) {
          index += slideBy * dir;
          if (autoWidth) { index = Math.floor(index); }
          // pass e when click control buttons or keydown
          render((passEventObject || (e && e.type === 'keydown')) ? e : null);
        }
      }

      // on nav click
      function onNavClick (e) {
        if (running) {
          if (preventActionWhenRunning) { return; } else { onTransitionEnd(); }
        }
        
        e = getEvent(e);
        var target = getTarget(e), navIndex;

        // find the clicked nav item
        while (target !== navContainer && !hasAttr(target, 'data-nav')) { target = target.parentNode; }
        if (hasAttr(target, 'data-nav')) {
          var navIndex = navClicked = Number(getAttr(target, 'data-nav')),
              targetIndexBase = fixedWidth || autoWidth ? navIndex * slideCount / pages : navIndex * items,
              targetIndex = navAsThumbnails ? navIndex : Math.min(Math.ceil(targetIndexBase), slideCount - 1);
          goTo(targetIndex, e);

          if (navCurrentIndex === navIndex) {
            if (animating) { stopAutoplay(); }
            navClicked = -1; // reset navClicked
          }
        }
      }

      // autoplay functions
      function setAutoplayTimer () {
        autoplayTimer = setInterval(function () {
          onControlsClick(null, autoplayDirection);
        }, autoplayTimeout);

        animating = true;
      }

      function stopAutoplayTimer () {
        clearInterval(autoplayTimer);
        animating = false;
      }

      function updateAutoplayButton (action, txt) {
        setAttrs(autoplayButton, {'data-action': action});
        autoplayButton.innerHTML = autoplayHtmlStrings[0] + action + autoplayHtmlStrings[1] + txt;
      }

      function startAutoplay () {
        setAutoplayTimer();
        if (autoplayButton) { updateAutoplayButton('stop', autoplayText[1]); }
      }

      function stopAutoplay () {
        stopAutoplayTimer();
        if (autoplayButton) { updateAutoplayButton('start', autoplayText[0]); }
      }

      // programaitcally play/pause the slider
      function play () {
        if (autoplay && !animating) {
          startAutoplay();
          autoplayUserPaused = false;
        }
      }
      function pause () {
        if (animating) {
          stopAutoplay();
          autoplayUserPaused = true;
        }
      }

      function toggleAutoplay () {
        if (animating) {
          stopAutoplay();
          autoplayUserPaused = true;
        } else {
          startAutoplay();
          autoplayUserPaused = false;
        }
      }

      function onVisibilityChange () {
        if (doc.hidden) {
          if (animating) {
            stopAutoplayTimer();
            autoplayVisibilityPaused = true;
          }
        } else if (autoplayVisibilityPaused) {
          setAutoplayTimer();
          autoplayVisibilityPaused = false;
        }
      }

      function mouseoverPause () {
        if (animating) { 
          stopAutoplayTimer();
          autoplayHoverPaused = true;
        }
      }

      function mouseoutRestart () {
        if (autoplayHoverPaused) { 
          setAutoplayTimer();
          autoplayHoverPaused = false;
        }
      }

      // keydown events on document 
      function onDocumentKeydown (e) {
        e = getEvent(e);
        var keyIndex = [KEYS.LEFT, KEYS.RIGHT].indexOf(e.keyCode);

        if (keyIndex >= 0) {
          onControlsClick(e, keyIndex === 0 ? -1 : 1);
        }
      }

      // on key control
      function onControlsKeydown (e) {
        e = getEvent(e);
        var keyIndex = [KEYS.LEFT, KEYS.RIGHT].indexOf(e.keyCode);

        if (keyIndex >= 0) {
          if (keyIndex === 0) {
            if (!prevButton.disabled) { onControlsClick(e, -1); }
          } else if (!nextButton.disabled) {
            onControlsClick(e, 1);
          }
        }
      }

      // set focus
      function setFocus (el) {
        el.focus();
      }

      // on key nav
      function onNavKeydown (e) {
        e = getEvent(e);
        var curElement = doc.activeElement;
        if (!hasAttr(curElement, 'data-nav')) { return; }

        // var code = e.keyCode,
        var keyIndex = [KEYS.LEFT, KEYS.RIGHT, KEYS.ENTER, KEYS.SPACE].indexOf(e.keyCode),
            navIndex = Number(getAttr(curElement, 'data-nav'));

        if (keyIndex >= 0) {
          if (keyIndex === 0) {
            if (navIndex > 0) { setFocus(navItems[navIndex - 1]); }
          } else if (keyIndex === 1) {
            if (navIndex < pages - 1) { setFocus(navItems[navIndex + 1]); }
          } else {
            navClicked = navIndex;
            goTo(navIndex, e);
          }
        }
      }

      function getEvent (e) {
        e = e || win.event;
        return isTouchEvent(e) ? e.changedTouches[0] : e;
      }
      function getTarget (e) {
        return e.target || win.event.srcElement;
      }

      function isTouchEvent (e) {
        return e.type.indexOf('touch') >= 0;
      }

      function preventDefaultBehavior (e) {
        e.preventDefault ? e.preventDefault() : e.returnValue = false;
      }

      function getMoveDirectionExpected () {
        return getTouchDirection(toDegree(lastPosition.y - initPosition.y, lastPosition.x - initPosition.x), swipeAngle) === options.axis;
      }

      function onPanStart (e) {
        if (running) {
          if (preventActionWhenRunning) { return; } else { onTransitionEnd(); }
        }

        if (autoplay && animating) { stopAutoplayTimer(); }
        
        panStart = true;
        if (rafIndex) {
          caf(rafIndex);
          rafIndex = null;
        }

        var $ = getEvent(e);
        events.emit(isTouchEvent(e) ? 'touchStart' : 'dragStart', info(e));

        if (!isTouchEvent(e) && ['img', 'a'].indexOf(getLowerCaseNodeName(getTarget(e))) >= 0) {
          preventDefaultBehavior(e);
        }

        lastPosition.x = initPosition.x = $.clientX;
        lastPosition.y = initPosition.y = $.clientY;
        if (carousel) {
          translateInit = parseFloat(container.style[transformAttr].replace(transformPrefix, ''));
          resetDuration(container, '0s');
        }
      }

      function onPanMove (e) {
        if (panStart) {
          var $ = getEvent(e);
          lastPosition.x = $.clientX;
          lastPosition.y = $.clientY;

          if (carousel) {
            if (!rafIndex) { rafIndex = raf$1(function(){ panUpdate(e); }); }
          } else {
            if (moveDirectionExpected === '?') { moveDirectionExpected = getMoveDirectionExpected(); }
            if (moveDirectionExpected) { preventScroll = true; }
          }

          if (preventScroll) { e.preventDefault(); }
        }
      }

      function panUpdate (e) {
        if (!moveDirectionExpected) {
          panStart = false;
          return;
        }
        caf(rafIndex);
        if (panStart) { rafIndex = raf$1(function(){ panUpdate(e); }); }

        if (moveDirectionExpected === '?') { moveDirectionExpected = getMoveDirectionExpected(); }
        if (moveDirectionExpected) {
          if (!preventScroll && isTouchEvent(e)) { preventScroll = true; }

          try {
            if (e.type) { events.emit(isTouchEvent(e) ? 'touchMove' : 'dragMove', info(e)); }
          } catch(err) {}

          var x = translateInit,
              dist = getDist(lastPosition, initPosition);
          if (!horizontal || fixedWidth || autoWidth) {
            x += dist;
            x += 'px';
          } else {
            var percentageX = TRANSFORM ? dist * items * 100 / ((viewport + gutter) * slideCountNew): dist * 100 / (viewport + gutter);
            x += percentageX;
            x += '%';
          }

          container.style[transformAttr] = transformPrefix + x + transformPostfix;
        }
      }

      function onPanEnd (e) {
        if (panStart) {
          if (rafIndex) {
            caf(rafIndex);
            rafIndex = null;
          }
          if (carousel) { resetDuration(container, ''); }
          panStart = false;

          var $ = getEvent(e);
          lastPosition.x = $.clientX;
          lastPosition.y = $.clientY;
          var dist = getDist(lastPosition, initPosition);

          if (Math.abs(dist)) {
            // drag vs click
            if (!isTouchEvent(e)) {
              // prevent "click"
              var target = getTarget(e);
              addEvents(target, {'click': function preventClick (e) {
                preventDefaultBehavior(e);
                removeEvents(target, {'click': preventClick});
              }}); 
            }

            if (carousel) {
              rafIndex = raf$1(function() {
                if (horizontal && !autoWidth) {
                  var indexMoved = - dist * items / (viewport + gutter);
                  indexMoved = dist > 0 ? Math.floor(indexMoved) : Math.ceil(indexMoved);
                  index += indexMoved;
                } else {
                  var moved = - (translateInit + dist);
                  if (moved <= 0) {
                    index = indexMin;
                  } else if (moved >= slidePositions[slideCountNew - 1]) {
                    index = indexMax;
                  } else {
                    var i = 0;
                    while (i < slideCountNew && moved >= slidePositions[i]) {
                      index = i;
                      if (moved > slidePositions[i] && dist < 0) { index += 1; }
                      i++;
                    }
                  }
                }

                render(e, dist);
                events.emit(isTouchEvent(e) ? 'touchEnd' : 'dragEnd', info(e));
              });
            } else {
              if (moveDirectionExpected) {
                onControlsClick(e, dist > 0 ? -1 : 1);
              }
            }
          }
        }

        // reset
        if (options.preventScrollOnTouch === 'auto') { preventScroll = false; }
        if (swipeAngle) { moveDirectionExpected = '?'; } 
        if (autoplay && !animating) { setAutoplayTimer(); }
      }

      // === RESIZE FUNCTIONS === //
      // (slidePositions, index, items) => vertical_conentWrapper.height
      function updateContentWrapperHeight () {
        var wp = middleWrapper ? middleWrapper : innerWrapper;
        wp.style.height = slidePositions[index + items] - slidePositions[index] + 'px';
      }

      function getPages () {
        var rough = fixedWidth ? (fixedWidth + gutter) * slideCount / viewport : slideCount / items;
        return Math.min(Math.ceil(rough), slideCount);
      }

      /*
       * 1. update visible nav items list
       * 2. add "hidden" attributes to previous visible nav items
       * 3. remove "hidden" attrubutes to new visible nav items
       */
      function updateNavVisibility () {
        if (!nav || navAsThumbnails) { return; }

        if (pages !== pagesCached) {
          var min = pagesCached,
              max = pages,
              fn = showElement;

          if (pagesCached > pages) {
            min = pages;
            max = pagesCached;
            fn = hideElement;
          }

          while (min < max) {
            fn(navItems[min]);
            min++;
          }

          // cache pages
          pagesCached = pages;
        }
      }

      function info (e) {
        return {
          container: container,
          slideItems: slideItems,
          navContainer: navContainer,
          navItems: navItems,
          controlsContainer: controlsContainer,
          hasControls: hasControls,
          prevButton: prevButton,
          nextButton: nextButton,
          items: items,
          slideBy: slideBy,
          cloneCount: cloneCount,
          slideCount: slideCount,
          slideCountNew: slideCountNew,
          index: index,
          indexCached: indexCached,
          displayIndex: getCurrentSlide(),
          navCurrentIndex: navCurrentIndex,
          navCurrentIndexCached: navCurrentIndexCached,
          pages: pages,
          pagesCached: pagesCached,
          sheet: sheet,
          isOn: isOn,
          event: e || {},
        };
      }

      return {
        version: '2.9.2',
        getInfo: info,
        events: events,
        goTo: goTo,
        play: play,
        pause: pause,
        isOn: isOn,
        updateSliderHeight: updateInnerWrapperHeight,
        refresh: initSliderTransform,
        destroy: destroy,
        rebuild: function() {
          return tns(extend(options, optionsElements));
        }
      };
    };

    /* src/olof-marsja/OlofMarsja.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/olof-marsja/OlofMarsja.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.iTem = list[i];
    	return child_ctx;
    }

    // (722:12) {#each iArray as iTem}
    function create_each_block(ctx) {
    	var div, t_value = ctx.iTem + "", t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			add_location(div, file$6, 722, 14, 22539);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(722:12) {#each iArray as iTem}", ctx });
    	return block;
    }

    function create_fragment$8(ctx) {
    	var t0, div8, div7, iframe, t1, div2, div1, img0, t2, div0, t3, br0, t4, br1, t5, br2, t6, br3, t7, br4, t8, br5, t9, br6, t10, br7, t11, br8, t12, br9, t13, br10, t14, br11, t15, br12, t16, br13, t17, br14, t18, br15, t19, br16, t20, br17, t21, br18, t22, br19, t23, br20, t24, br21, t25, br22, t26, br23, t27, br24, t28, br25, t29, br26, t30, br27, t31, br28, t32, br29, t33, br30, t34, br31, t35, br32, t36, br33, t37, br34, t38, br35, t39, br36, t40, br37, t41, br38, t42, br39, t43, br40, t44, br41, t45, br42, t46, br43, t47, br44, t48, br45, t49, br46, t50, br47, t51, br48, t52, br49, t53, br50, t54, br51, t55, br52, t56, br53, t57, br54, t58, br55, t59, br56, t60, br57, t61, br58, t62, br59, t63, br60, t64, br61, t65, br62, t66, br63, t67, br64, t68, br65, t69, br66, t70, br67, t71, br68, t72, br69, t73, br70, t74, br71, t75, br72, t76, br73, t77, br74, t78, br75, t79, br76, t80, br77, t81, br78, t82, br79, t83, br80, t84, br81, t85, br82, t86, br83, t87, br84, t88, br85, t89, br86, t90, br87, t91, br88, t92, br89, t93, br90, t94, br91, t95, br92, t96, br93, t97, br94, t98, br95, t99, br96, t100, br97, t101, br98, t102, br99, t103, br100, t104, br101, t105, br102, t106, br103, t107, br104, t108, br105, t109, br106, t110, br107, t111, br108, t112, br109, t113, t114, div6, div5, img1, t115, div4, div3, div7_intro;

    	let each_value = ctx.iArray;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			t0 = space();
    			div8 = element("div");
    			div7 = element("div");
    			iframe = element("iframe");
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			img0 = element("img");
    			t2 = space();
    			div0 = element("div");
    			t3 = text("Hola Olof\n          ");
    			br0 = element("br");
    			t4 = text("\n          THIS JUST IN —\n          ");
    			br1 = element("br");
    			t5 = text("\n          Former favourite frequency of the world, commonly known as #love, is\n          struggling to find outlets for expression!\n          ");
    			br2 = element("br");
    			t6 = text("\n          WHAT?\n          ");
    			br3 = element("br");
    			t7 = text("\n          I know.\n          ");
    			br4 = element("br");
    			t8 = text("\n          Due to the steady increase of human interest in drama and distraction\n          – globally – #love is officially at risk of not being\n          commonly felt.\n          ");
    			br5 = element("br");
    			t9 = text("\n          Brace yourself ladies and gentlemen, #love is officially an Endangered\n          Frequency!\n          ");
    			br6 = element("br");
    			t10 = text("\n          As most people are aware, the Emotional/Energetic StockMarket is\n          teaming with options! Love, joy, creativity, patience, chill and\n          kindness are most certainly some tasty favourites. There are also some\n          spicier vibes up for investment such as frustration, anger, doubt,\n          apathy and the ever increasing popular vibe – #fear.\n          ");
    			br7 = element("br");
    			t11 = text("\n          #Fear’s marketing campaign is something to behold. Catching the\n          attention of millions and millions of attention investors, it has\n          literally swept through the Mental Atmosphere of humanity –\n          like a virus.\n          ");
    			br8 = element("br");
    			t12 = text("\n          Passed around Via Us.\n          ");
    			br9 = element("br");
    			t13 = text("\n          It is a radical thought, that #fear gets up to 80% more airtime than\n          any other vibe?\n          ");
    			br10 = element("br");
    			t14 = text("\n          So what of these nourishing vibes that are no longer so popular?\n          ");
    			br11 = element("br");
    			t15 = text("\n          Do they just have weak marketing? Bad branding? Not enough likes and\n          followers?\n          ");
    			br12 = element("br");
    			t16 = text("\n          A few weeks ago it was announced, the most recent vibe to join the\n          endangered frequency list was #freedom.\n          ");
    			br13 = element("br");
    			t17 = text("\n          WHAT?!!!!!\n          ");
    			br14 = element("br");
    			t18 = text("\n          Of all the things to go out of fashion? FREEDOM!!! But how can it\n          happen?\n          ");
    			br15 = element("br");
    			t19 = text("\n          According to NOW NiNJAs all over the world, it has been a very sneaky\n          series of events, #limitation and #restriction have been parading\n          around like law and order – creating the illusion that more\n          rules are cool – and we need more and more of them. So, rules\n          are on the rise, yet little do people know that many of them are\n          funded by #limitation and #fear.\n          ");
    			br16 = element("br");
    			t20 = text("\n          The status of #trust is being watched VERY carefully. It seems that\n          the deeply rich imagination of a hand full of dreamers in this world,\n          is still holding #trust in it’s fundamental place… but\n          who knows for how long…\n          ");
    			br17 = element("br");
    			t21 = text("\n          Reports are coming in from all over NowHere, that some of our classic\n          good vibes – are missing.\n          ");
    			br18 = element("br");
    			t22 = text("\n          Think about it for a moment, are there some feelings you miss feeling?\n          Are your best emotions only active as memories? Well, you are not\n          alone.\n          ");
    			br19 = element("br");
    			t23 = text("\n          It’s not just you, this has become our global energetic\n          culture. It is more common for people to feel concern or anxious than\n          they are to feel inspired and powerful.\n          ");
    			br20 = element("br");
    			t24 = text("\n          Which brings us to the Present Moment.\n          ");
    			br21 = element("br");
    			t25 = text("\n          The NOW needs you! For conscious participation in the Present Moment!\n          ");
    			br22 = element("br");
    			t26 = text("\n          Are you ready to play the GAME?!!!\n          ");
    			br23 = element("br");
    			t27 = space();
    			br24 = element("br");
    			t28 = text("\n          Hola Olof\n          ");
    			br25 = element("br");
    			t29 = text("\n          Getting bombarded in you inbox is one thing, but getting bombarded in\n          your mind is another!\n          ");
    			br26 = element("br");
    			t30 = text("\n          In this 'high-tech, low touch' time we REALLY have to filter\n          what we let in...\n          ");
    			br27 = element("br");
    			t31 = text("\n          What we let in – reflects what we 'put out'. And the\n          essence of what we put out – determines what comes back in.\n          ");
    			br28 = element("br");
    			t32 = text("\n          Oh! What a sneaky little circle!\n          ");
    			br29 = element("br");
    			t33 = text("\n          The sheer volume of information is an avalanche on your awareness!!\n          Scrolling, clicking, watching and listening. Every iota of information\n          generates a thought and feeling from you. We are speeding up, scanning\n          and spamming, letting more in...\n          ");
    			br30 = element("br");
    			t34 = text("\n          Thanks for your precious attention.\n          ");
    			br31 = element("br");
    			t35 = text("\n          #legit.\n          ");
    			br32 = element("br");
    			t36 = text("\n          The wrong advertisements in your awareness can shorten your attention\n          span!\n          ");
    			br33 = element("br");
    			t37 = text("\n          ⚠️ Not to mention turn you into a momenterrorist!\n          ⚠️\n          ");
    			br34 = element("br");
    			t38 = text("\n          Quality control is the order of the day!\n          ");
    			br35 = element("br");
    			t39 = text("\n          Looking at this epidemic, I put my NOW NiNJA jumpsuit on and came up\n          with a genius way to sneak up on your awareness....\n          ");
    			br36 = element("br");
    			t40 = space();
    			br37 = element("br");
    			t41 = text("\n          Hola Olof\n          ");
    			br38 = element("br");
    			t42 = text("\n          Two of the biggest challenges that individuals have with holding a new\n          vision for their lives is:\n          ");
    			br39 = element("br");
    			t43 = text("\n          #1. Forgetting to do it. (We are just too busy!)\n          ");
    			br40 = element("br");
    			t44 = text("\n          #2. Struggling to feel and think beyond who they are in this moment.\n          ");
    			br41 = element("br");
    			t45 = text("\n          It makes sense that it is challenging, after all, you are VERY good at\n          being this version of you. You've been in this role for what? 20,\n          30, 40, 50 years?!!\n          ");
    			br42 = element("br");
    			t46 = text("\n          No wonder it can feel so hard to change!!\n          ");
    			br43 = element("br");
    			t47 = text("\n          We are mostly a collection of habits!\n          ");
    			br44 = element("br");
    			t48 = text("\n          Change takes practice. Persistence. Courage. You have to catch\n          yourself out in the NOWness of a moment and load and code your new\n          program – on the spot.\n          ");
    			br45 = element("br");
    			t49 = text("\n          You've got to turn up at rehearsal and learn the new script.\n          ");
    			br46 = element("br");
    			t50 = text("\n          You have practice a new posture and exude a new vibe.\n          ");
    			br47 = element("br");
    			t51 = text("\n          You have to practice complete emotional investment to become a new\n          identity\n          ");
    			br48 = element("br");
    			t52 = text("\n          AND\n          ");
    			br49 = element("br");
    			t53 = text("\n          you have to start right from where you are, in the life that you have\n          – with the habits that you currently have.\n          ");
    			br50 = element("br");
    			t54 = text("\n          Do you have a plan? Whatcha going to do NOW, NiNJA?! 5,6,7,8!!!\n          ");
    			br51 = element("br");
    			t55 = space();
    			br52 = element("br");
    			t56 = text("\n          Hola Olof!!!\n          ");
    			br53 = element("br");
    			t57 = text("\n          LiFE!! What a Game! We count down to the NOW! and then we launch\n          ourselves, victoriously, into the new NOW, with a few more layers,\n          lessons and desires and hopefully a few less layers of worry and fear!\n          Some of us are hungry, eagerly wanting to become more of ourselves.\n          Some of us are wanting last year to disappear as quickly as possible,\n          because the pain of that chapter was too much to bare. Wherever you\n          are on the spectrum of vibes, I hope we can meet in the middle of\n          ");
    			br54 = element("br");
    			t58 = text("\n          ––––––––>>>\n          THiS\n          <<<––––––––\n          moment\n          ");
    			br55 = element("br");
    			t59 = text("\n          understanding that life is but a stream of elegant instants, and ALL\n          moments are created equal! The Game of Life rolls on.\n          ");
    			br56 = element("br");
    			t60 = text("\n          Rumour has is it – the ebb and flow of 3D life is not for the\n          faint hearted. Duality is in fact quite an emotional war zone! But as\n          you look back into 2018 – at what happened, who happened, the\n          plot twists, the connections, the break ups, the breakthroughs, I\n          trust you will find a way to\n          –––>>> rest\n          <<<––– in your mighty unfolding.\n          ");
    			br57 = element("br");
    			t61 = text("\n          NiNJA yo self into the NOW!\n          ");
    			br58 = element("br");
    			t62 = text("\n          Let yourself off the hook! And while you are at it… stretch\n          yourself a little further, because I have a sneaking suspicion that\n          eternity is a long time and that THiS moment (in particular) REALLY\n          counts! Here’s to a mighty 2019! And here’s to a\n          deepening devotion to creating quality moments.\n          ");
    			br59 = element("br");
    			t63 = text("\n          THERE IS SO MUCH GOODNESS GOING ON IN THIS WORLD! Thanks for being a\n          part of the answer Olof <3\n          ");
    			br60 = element("br");
    			t64 = text("\n          Hola Olof!!\n          ");
    			br61 = element("br");
    			t65 = text("\n          How can I stay positive and inspired in negative environments? THIS is\n          one of my favourite questions of All Time! AND it becomes more and\n          more relevant during this incredible time in human history! Staying\n          inspired and plugged into your potential is the ultimate quest in Time\n          and Space.\n          ");
    			br62 = element("br");
    			t66 = text("\n          Not only do we have to find ways to dodge the damage, we want to\n          strengthen our focus, be solution orientated, and represent the\n          possibilities during this incredible time!\n          ");
    			br63 = element("br");
    			t67 = text("\n          Yet shortly after leaving the comfort of your own NOW LAB, the battle\n          begins. The sheer onslaught of negative messaging is coming right at\n          ya!\n          ");
    			br64 = element("br");
    			t68 = text("\n          Yet... YOU are the HERO in this story! SO, how are you going to stay\n          awake NOW, NiNJA…? Especially when you are surrounded by those\n          intense ‘momenterrorists!’ I trust this vid will remind\n          you to find creative ways to stay on the path.\n          🏽⭐️\n          ");
    			br65 = element("br");
    			t69 = space();
    			br66 = element("br");
    			t70 = text("\n          Hey there Olof Do you ever get a sense, that something is trying to\n          happen through you? Like there is something giant in you; a gift, a\n          talent, a capacity!\n          ");
    			br67 = element("br");
    			t71 = text("\n          Whatever it is, it scares the wits out of you – because you\n          have no idea of HOW to get from where you are right now, to living\n          that life of #creativity, #freedom, #service and #abundance! In fact,\n          it looks perfectly impossible.\n          ");
    			br68 = element("br");
    			t72 = text("\n          But you and I know, even though this dream goes against all your logic\n          and reasoning, it has somehow hit you deep in the NOW ;)\n          ");
    			br69 = element("br");
    			t73 = text("\n          And it just won't – go – away.\n          ");
    			br70 = element("br");
    			t74 = text("\n          So whether you are tormented by a vision, or you are yet to really\n          uncover and discover your 'thing'....\n          ");
    			br71 = element("br");
    			t75 = text("\n          NOW is the time to start asking yourself – some radically\n          different questions.\n          ");
    			br72 = element("br");
    			t76 = text("\n          I can help you do just that.\n          ");
    			br73 = element("br");
    			t77 = space();
    			br74 = element("br");
    			t78 = text("\n          Hola Olof\n          ");
    			br75 = element("br");
    			t79 = text("\n          Do you feel your Divine Assignment? Do you wake up everyday, ready to\n          hear the intuitive marching orders from the Intelligence of Source?\n          ");
    			br76 = element("br");
    			t80 = text("\n          With so much distraction coming in from everywhere, what does it take\n          to be the hero in your own story?\n          ");
    			br77 = element("br");
    			t81 = text("\n          Here is a summary of the task at hand, with love from....\n          ");
    			br78 = element("br");
    			t82 = text("\n          \t \t\t\t \t\t\t\t Sometimes your own\n          'momenterrorism' can be so bad you actually believe\n          everything is working against you. You envision your happiness gagged\n          and bound; being held ransom by some invisible power in the\n          universe!!!\n          ");
    			br79 = element("br");
    			t83 = text("\n          Wrong.\n          ");
    			br80 = element("br");
    			t84 = text("\n          R.O.N.G. :)\n          ");
    			br81 = element("br");
    			t85 = text("\n          Wrong.\n          ");
    			br82 = element("br");
    			t86 = text("\n          Your happiness is NOT being held ransom by an all powerful\n          somethin'-or-other. The only thing lording over you is –\n          your own stagnated perception. AKA: resistance.\n          ");
    			br83 = element("br");
    			t87 = text("\n          Argh! Really?\n          ");
    			br84 = element("br");
    			t88 = text("\n          I know, it's an anti-climax to reality.\n          ");
    			br85 = element("br");
    			t89 = text("\n          Lucky for you, you can just get out of the way and let it flow.\n          ");
    			br86 = element("br");
    			t90 = text("\n          HOW?\n          ");
    			br87 = element("br");
    			t91 = text("\n          1. Be# willing. Willingness will get you every where these days ;)\n          ");
    			br88 = element("br");
    			t92 = text("\n          2. Take your Vow to NOW – make this decision important!! Make\n          (the quality of) your life depend on it! I'm talking about a real\n          promise to bring a high quality participation to the present moment.\n          ");
    			br89 = element("br");
    			t93 = text("\n          3. Develop some NOWism strategies to take care of your\n          'momenterrorists' when they arise to hi-jack your mind. Try\n          the NOWism FREE Mini Course >>> NEOS <<<\n          if you haven't already! (That is a FREE download.)\n          ");
    			br90 = element("br");
    			t94 = text("\n          You're welcome…\n          ");
    			br91 = element("br");
    			t95 = text("\n          Hola Olof!\n          ");
    			br92 = element("br");
    			t96 = text("\n          WARNING! Humans can whinge about the most insignificant things! The\n          ego goes on a rampage, feeling entitled to more, more, MORE!\n          ");
    			br93 = element("br");
    			t97 = text("\n          Meanwhile (in reality), infinite gifts have already been given!\n          ");
    			br94 = element("br");
    			t98 = text("\n          NOW NiNJA response:\n          ");
    			br95 = element("br");
    			t99 = text("\n          Get out your cosmic cheque book.... and write yourself a little\n          reminder.\n          ");
    			br96 = element("br");
    			t100 = text("\n          STOP! Stand still and let the love in!\n          ");
    			br97 = element("br");
    			t101 = text("\n          Deflecting compliments is a disempowering energetic posture. It is\n          like refusing a most generous gift AND it is spiritually rude.\n          ");
    			br98 = element("br");
    			t102 = text("\n          Learning how to gracefully receive a compliment is a powerful step in\n          the journey of self empowerment.\n          ");
    			br99 = element("br");
    			t103 = text("\n          So what’s going on with that anyway? Why do so many of us\n          flinch when someone gives us a compliment?\n          ");
    			br100 = element("br");
    			t104 = text("\n          I have a little tale to share with you... A few years ago, here in\n          Swaziland, Africa, I complimented a woman on the boldly colourful\n          dress she was wearing. “Wow! That is a beautiful colour on\n          you!”\n          ");
    			br101 = element("br");
    			t105 = text("\n          She responded with, “I know, that is true. Thank you.”\n          ");
    			br102 = element("br");
    			t106 = text("\n          She took that compliment head on, without a minuscule of hesitation or\n          doubt. In fact she opened up and revelled in the greatness of how it\n          felt. And that, my NiNJA friend, is not ego, it is the glory of true\n          #selfworth.\n          ");
    			br103 = element("br");
    			t107 = text("\n          I remember how I felt as she soaked up my compliment without delay\n          – it felt slightly shocking to be honest, and that’s\n          when I realised, this is a very interesting energetic culture that we\n          have been perpetuating.\n          ");
    			br104 = element("br");
    			t108 = text("\n          #fear of appearing egotistical has high-jacked basic self worth in our\n          western culture – in a most terrible way.\n          ");
    			br105 = element("br");
    			t109 = text("\n          Not only do we flinch when people give us a compliment, we also scowl\n          if someone else enjoys and fully receives a compliment.\n          ");
    			br106 = element("br");
    			t110 = text("\n          WHAT?\n          ");
    			br107 = element("br");
    			t111 = text("\n          Now clearly there is a difference between a rampaging ego and genuine\n          self worth, and it is time for us to stop being so self-depreciating\n          and start to stand up straight and SEE straight!\n          ");
    			br108 = element("br");
    			t112 = text("\n          The new culture starts with you and me.\n          ");
    			br109 = element("br");
    			t113 = text("\n          May you take the complimentary ticket, Olof, from this present moment\n          and admit your awesomeness.");
    			t114 = space();
    			div6 = element("div");
    			div5 = element("div");
    			img1 = element("img");
    			t115 = space();
    			div4 = element("div");
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			document.title = "Olof Marsja | LIQUID FICTION";
    			attr_dev(iframe, "alt", "Olof Marsja");
    			attr_dev(iframe, "title", "Olof Marsja");
    			attr_dev(iframe, "src", "");
    			attr_dev(iframe, "id", "api-frame");
    			attr_dev(iframe, "allow", "autoplay; fullscreen; vr");
    			attr_dev(iframe, "allowvr", "");
    			iframe.allowFullscreen = true;
    			attr_dev(iframe, "mozallowfullscreen", "true");
    			attr_dev(iframe, "webkitallowfullscreen", "true");
    			attr_dev(iframe, "class", "svelte-phcgsp");
    			toggle_class(iframe, "loaded", ctx.loaded);
    			add_location(iframe, file$6, 359, 4, 6277);
    			attr_dev(img0, "src", "/img/plate1.png");
    			attr_dev(img0, "alt", "Olof Marsja - Plate 1");
    			attr_dev(img0, "class", "svelte-phcgsp");
    			add_location(img0, file$6, 377, 8, 6761);
    			add_location(br0, file$6, 380, 10, 6876);
    			add_location(br1, file$6, 382, 10, 6925);
    			add_location(br2, file$6, 385, 10, 7074);
    			add_location(br3, file$6, 387, 10, 7107);
    			add_location(br4, file$6, 389, 10, 7142);
    			add_location(br5, file$6, 393, 10, 7342);
    			add_location(br6, file$6, 396, 10, 7461);
    			add_location(br7, file$6, 402, 10, 7856);
    			add_location(br8, file$6, 407, 10, 8131);
    			add_location(br9, file$6, 409, 10, 8180);
    			add_location(br10, file$6, 412, 10, 8302);
    			add_location(br11, file$6, 414, 10, 8394);
    			add_location(br12, file$6, 417, 10, 8511);
    			add_location(br13, file$6, 420, 10, 8655);
    			add_location(br14, file$6, 422, 10, 8693);
    			add_location(br15, file$6, 425, 10, 8804);
    			add_location(br16, file$6, 432, 10, 9251);
    			add_location(br17, file$6, 437, 10, 9546);
    			add_location(br18, file$6, 440, 10, 9686);
    			add_location(br19, file$6, 444, 10, 9877);
    			add_location(br20, file$6, 448, 10, 10097);
    			add_location(br21, file$6, 450, 10, 10163);
    			add_location(br22, file$6, 452, 10, 10260);
    			add_location(br23, file$6, 454, 10, 10322);
    			add_location(br24, file$6, 455, 10, 10339);
    			add_location(br25, file$6, 457, 10, 10376);
    			add_location(br26, file$6, 460, 10, 10505);
    			add_location(br27, file$6, 463, 10, 10631);
    			add_location(br28, file$6, 466, 10, 10805);
    			add_location(br29, file$6, 468, 10, 10865);
    			add_location(br30, file$6, 473, 10, 11165);
    			add_location(br31, file$6, 475, 10, 11228);
    			add_location(br32, file$6, 477, 10, 11263);
    			add_location(br33, file$6, 480, 10, 11376);
    			add_location(br34, file$6, 483, 10, 11494);
    			add_location(br35, file$6, 485, 10, 11562);
    			add_location(br36, file$6, 488, 10, 11720);
    			add_location(br37, file$6, 489, 10, 11737);
    			add_location(br38, file$6, 491, 10, 11774);
    			add_location(br39, file$6, 494, 10, 11909);
    			add_location(br40, file$6, 496, 10, 11985);
    			add_location(br41, file$6, 498, 10, 12081);
    			add_location(br42, file$6, 502, 10, 12290);
    			add_location(br43, file$6, 504, 10, 12359);
    			add_location(br44, file$6, 506, 10, 12424);
    			add_location(br45, file$6, 510, 10, 12631);
    			add_location(br46, file$6, 512, 10, 12724);
    			add_location(br47, file$6, 514, 10, 12805);
    			add_location(br48, file$6, 517, 10, 12918);
    			add_location(br49, file$6, 519, 10, 12949);
    			add_location(br50, file$6, 522, 10, 13106);
    			add_location(br51, file$6, 524, 10, 13197);
    			add_location(br52, file$6, 525, 10, 13214);
    			add_location(br53, file$6, 527, 10, 13254);
    			add_location(br54, file$6, 535, 10, 13816);
    			add_location(br55, file$6, 540, 10, 14051);
    			add_location(br56, file$6, 543, 10, 14211);
    			add_location(br57, file$6, 551, 10, 14718);
    			add_location(br58, file$6, 553, 10, 14773);
    			add_location(br59, file$6, 559, 10, 15154);
    			add_location(br60, file$6, 562, 10, 15292);
    			add_location(br61, file$6, 564, 10, 15331);
    			add_location(br62, file$6, 570, 10, 15686);
    			add_location(br63, file$6, 574, 10, 15905);
    			add_location(br64, file$6, 578, 10, 16095);
    			add_location(br65, file$6, 584, 10, 16444);
    			add_location(br66, file$6, 585, 10, 16461);
    			add_location(br67, file$6, 589, 10, 16664);
    			add_location(br68, file$6, 594, 10, 16956);
    			add_location(br69, file$6, 597, 10, 17121);
    			add_location(br70, file$6, 599, 10, 17198);
    			add_location(br71, file$6, 602, 10, 17350);
    			add_location(br72, file$6, 605, 10, 17473);
    			add_location(br73, file$6, 607, 10, 17529);
    			add_location(br74, file$6, 608, 10, 17546);
    			add_location(br75, file$6, 610, 10, 17583);
    			add_location(br76, file$6, 613, 10, 17758);
    			add_location(br77, file$6, 616, 10, 17899);
    			add_location(br78, file$6, 618, 10, 17984);
    			add_location(br79, file$6, 624, 10, 18317);
    			add_location(br80, file$6, 626, 10, 18351);
    			add_location(br81, file$6, 628, 10, 18390);
    			add_location(br82, file$6, 630, 10, 18424);
    			add_location(br83, file$6, 634, 10, 18647);
    			add_location(br84, file$6, 636, 10, 18688);
    			add_location(br85, file$6, 638, 10, 18760);
    			add_location(br86, file$6, 640, 10, 18851);
    			add_location(br87, file$6, 642, 10, 18883);
    			add_location(br88, file$6, 644, 10, 18977);
    			add_location(br89, file$6, 648, 10, 19233);
    			add_location(br90, file$6, 653, 10, 19542);
    			add_location(br91, file$6, 655, 10, 19597);
    			add_location(br92, file$6, 657, 10, 19635);
    			add_location(br93, file$6, 660, 10, 19801);
    			add_location(br94, file$6, 662, 10, 19892);
    			add_location(br95, file$6, 664, 10, 19939);
    			add_location(br96, file$6, 667, 10, 20050);
    			add_location(br97, file$6, 669, 10, 20116);
    			add_location(br98, file$6, 672, 10, 20283);
    			add_location(br99, file$6, 675, 10, 20423);
    			add_location(br100, file$6, 678, 10, 20568);
    			add_location(br101, file$6, 683, 10, 20837);
    			add_location(br102, file$6, 685, 10, 20933);
    			add_location(br103, file$6, 690, 10, 21211);
    			add_location(br104, file$6, 695, 10, 21496);
    			add_location(br105, file$6, 698, 10, 21653);
    			add_location(br106, file$6, 701, 10, 21816);
    			add_location(br107, file$6, 703, 10, 21849);
    			add_location(br108, file$6, 707, 10, 22084);
    			add_location(br109, file$6, 709, 10, 22151);
    			attr_dev(div0, "class", "text svelte-phcgsp");
    			add_location(div0, file$6, 378, 8, 6827);
    			attr_dev(div1, "class", "inner svelte-phcgsp");
    			add_location(div1, file$6, 376, 6, 6733);
    			attr_dev(div2, "class", "plate-1 svelte-phcgsp");
    			add_location(div2, file$6, 375, 4, 6705);
    			attr_dev(img1, "src", "/img/Rock.png");
    			attr_dev(img1, "alt", "Olof Marsja - Rock");
    			attr_dev(img1, "class", "svelte-phcgsp");
    			add_location(img1, file$6, 718, 8, 22373);
    			add_location(div3, file$6, 720, 10, 22463);
    			attr_dev(div4, "class", "text svelte-phcgsp");
    			add_location(div4, file$6, 719, 8, 22434);
    			attr_dev(div5, "class", "inner svelte-phcgsp");
    			add_location(div5, file$6, 717, 6, 22345);
    			attr_dev(div6, "class", "rock svelte-phcgsp");
    			add_location(div6, file$6, 716, 4, 22320);
    			attr_dev(div7, "class", "container svelte-phcgsp");
    			add_location(div7, file$6, 355, 2, 6178);
    			attr_dev(div8, "class", "olof svelte-phcgsp");
    			add_location(div8, file$6, 353, 0, 6156);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, iframe);
    			ctx.iframe_binding(iframe);
    			append_dev(div7, t1);
    			append_dev(div7, div2);
    			append_dev(div2, div1);
    			append_dev(div1, img0);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, t3);
    			append_dev(div0, br0);
    			append_dev(div0, t4);
    			append_dev(div0, br1);
    			append_dev(div0, t5);
    			append_dev(div0, br2);
    			append_dev(div0, t6);
    			append_dev(div0, br3);
    			append_dev(div0, t7);
    			append_dev(div0, br4);
    			append_dev(div0, t8);
    			append_dev(div0, br5);
    			append_dev(div0, t9);
    			append_dev(div0, br6);
    			append_dev(div0, t10);
    			append_dev(div0, br7);
    			append_dev(div0, t11);
    			append_dev(div0, br8);
    			append_dev(div0, t12);
    			append_dev(div0, br9);
    			append_dev(div0, t13);
    			append_dev(div0, br10);
    			append_dev(div0, t14);
    			append_dev(div0, br11);
    			append_dev(div0, t15);
    			append_dev(div0, br12);
    			append_dev(div0, t16);
    			append_dev(div0, br13);
    			append_dev(div0, t17);
    			append_dev(div0, br14);
    			append_dev(div0, t18);
    			append_dev(div0, br15);
    			append_dev(div0, t19);
    			append_dev(div0, br16);
    			append_dev(div0, t20);
    			append_dev(div0, br17);
    			append_dev(div0, t21);
    			append_dev(div0, br18);
    			append_dev(div0, t22);
    			append_dev(div0, br19);
    			append_dev(div0, t23);
    			append_dev(div0, br20);
    			append_dev(div0, t24);
    			append_dev(div0, br21);
    			append_dev(div0, t25);
    			append_dev(div0, br22);
    			append_dev(div0, t26);
    			append_dev(div0, br23);
    			append_dev(div0, t27);
    			append_dev(div0, br24);
    			append_dev(div0, t28);
    			append_dev(div0, br25);
    			append_dev(div0, t29);
    			append_dev(div0, br26);
    			append_dev(div0, t30);
    			append_dev(div0, br27);
    			append_dev(div0, t31);
    			append_dev(div0, br28);
    			append_dev(div0, t32);
    			append_dev(div0, br29);
    			append_dev(div0, t33);
    			append_dev(div0, br30);
    			append_dev(div0, t34);
    			append_dev(div0, br31);
    			append_dev(div0, t35);
    			append_dev(div0, br32);
    			append_dev(div0, t36);
    			append_dev(div0, br33);
    			append_dev(div0, t37);
    			append_dev(div0, br34);
    			append_dev(div0, t38);
    			append_dev(div0, br35);
    			append_dev(div0, t39);
    			append_dev(div0, br36);
    			append_dev(div0, t40);
    			append_dev(div0, br37);
    			append_dev(div0, t41);
    			append_dev(div0, br38);
    			append_dev(div0, t42);
    			append_dev(div0, br39);
    			append_dev(div0, t43);
    			append_dev(div0, br40);
    			append_dev(div0, t44);
    			append_dev(div0, br41);
    			append_dev(div0, t45);
    			append_dev(div0, br42);
    			append_dev(div0, t46);
    			append_dev(div0, br43);
    			append_dev(div0, t47);
    			append_dev(div0, br44);
    			append_dev(div0, t48);
    			append_dev(div0, br45);
    			append_dev(div0, t49);
    			append_dev(div0, br46);
    			append_dev(div0, t50);
    			append_dev(div0, br47);
    			append_dev(div0, t51);
    			append_dev(div0, br48);
    			append_dev(div0, t52);
    			append_dev(div0, br49);
    			append_dev(div0, t53);
    			append_dev(div0, br50);
    			append_dev(div0, t54);
    			append_dev(div0, br51);
    			append_dev(div0, t55);
    			append_dev(div0, br52);
    			append_dev(div0, t56);
    			append_dev(div0, br53);
    			append_dev(div0, t57);
    			append_dev(div0, br54);
    			append_dev(div0, t58);
    			append_dev(div0, br55);
    			append_dev(div0, t59);
    			append_dev(div0, br56);
    			append_dev(div0, t60);
    			append_dev(div0, br57);
    			append_dev(div0, t61);
    			append_dev(div0, br58);
    			append_dev(div0, t62);
    			append_dev(div0, br59);
    			append_dev(div0, t63);
    			append_dev(div0, br60);
    			append_dev(div0, t64);
    			append_dev(div0, br61);
    			append_dev(div0, t65);
    			append_dev(div0, br62);
    			append_dev(div0, t66);
    			append_dev(div0, br63);
    			append_dev(div0, t67);
    			append_dev(div0, br64);
    			append_dev(div0, t68);
    			append_dev(div0, br65);
    			append_dev(div0, t69);
    			append_dev(div0, br66);
    			append_dev(div0, t70);
    			append_dev(div0, br67);
    			append_dev(div0, t71);
    			append_dev(div0, br68);
    			append_dev(div0, t72);
    			append_dev(div0, br69);
    			append_dev(div0, t73);
    			append_dev(div0, br70);
    			append_dev(div0, t74);
    			append_dev(div0, br71);
    			append_dev(div0, t75);
    			append_dev(div0, br72);
    			append_dev(div0, t76);
    			append_dev(div0, br73);
    			append_dev(div0, t77);
    			append_dev(div0, br74);
    			append_dev(div0, t78);
    			append_dev(div0, br75);
    			append_dev(div0, t79);
    			append_dev(div0, br76);
    			append_dev(div0, t80);
    			append_dev(div0, br77);
    			append_dev(div0, t81);
    			append_dev(div0, br78);
    			append_dev(div0, t82);
    			append_dev(div0, br79);
    			append_dev(div0, t83);
    			append_dev(div0, br80);
    			append_dev(div0, t84);
    			append_dev(div0, br81);
    			append_dev(div0, t85);
    			append_dev(div0, br82);
    			append_dev(div0, t86);
    			append_dev(div0, br83);
    			append_dev(div0, t87);
    			append_dev(div0, br84);
    			append_dev(div0, t88);
    			append_dev(div0, br85);
    			append_dev(div0, t89);
    			append_dev(div0, br86);
    			append_dev(div0, t90);
    			append_dev(div0, br87);
    			append_dev(div0, t91);
    			append_dev(div0, br88);
    			append_dev(div0, t92);
    			append_dev(div0, br89);
    			append_dev(div0, t93);
    			append_dev(div0, br90);
    			append_dev(div0, t94);
    			append_dev(div0, br91);
    			append_dev(div0, t95);
    			append_dev(div0, br92);
    			append_dev(div0, t96);
    			append_dev(div0, br93);
    			append_dev(div0, t97);
    			append_dev(div0, br94);
    			append_dev(div0, t98);
    			append_dev(div0, br95);
    			append_dev(div0, t99);
    			append_dev(div0, br96);
    			append_dev(div0, t100);
    			append_dev(div0, br97);
    			append_dev(div0, t101);
    			append_dev(div0, br98);
    			append_dev(div0, t102);
    			append_dev(div0, br99);
    			append_dev(div0, t103);
    			append_dev(div0, br100);
    			append_dev(div0, t104);
    			append_dev(div0, br101);
    			append_dev(div0, t105);
    			append_dev(div0, br102);
    			append_dev(div0, t106);
    			append_dev(div0, br103);
    			append_dev(div0, t107);
    			append_dev(div0, br104);
    			append_dev(div0, t108);
    			append_dev(div0, br105);
    			append_dev(div0, t109);
    			append_dev(div0, br106);
    			append_dev(div0, t110);
    			append_dev(div0, br107);
    			append_dev(div0, t111);
    			append_dev(div0, br108);
    			append_dev(div0, t112);
    			append_dev(div0, br109);
    			append_dev(div0, t113);
    			append_dev(div7, t114);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, img1);
    			append_dev(div5, t115);
    			append_dev(div5, div4);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			ctx.div3_binding(div3);
    		},

    		p: function update(changed, ctx) {
    			if (changed.loaded) {
    				toggle_class(iframe, "loaded", ctx.loaded);
    			}

    			if (changed.iArray) {
    				each_value = ctx.iArray;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: function intro(local) {
    			if (!div7_intro) {
    				add_render_callback(() => {
    					div7_intro = create_in_transition(div7, fly, { duration: 800, x: 60, delay: 0, easing: quartOut });
    					div7_intro.start();
    				});
    			}
    		},

    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(div8);
    			}

    			ctx.iframe_binding(null);

    			destroy_each(each_blocks, detaching);

    			ctx.div3_binding(null);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $menuActive;

    	validate_store(menuActive, 'menuActive');
    	component_subscribe($$self, menuActive, $$value => { $menuActive = $$value; $$invalidate('$menuActive', $menuActive); });

    	

      activePage.set("olof");
      orbBackgroundOne.set("rgba(128,25,55,1)");
      orbBackgroundTwo.set("rgba(145,100,127,1)");

      orbColorOne.set("rgba(255,255,255,1)");
      orbColorTwo.set("rgba(0,0,0,1)");

      let iframeEl = {};
      let iSlideEl = {};
      let loaded = false;
      let sketchFabClient = {};
      let slider = {};

      // $: {
      //   if ($menuActive) {
      //     slider.pause();
      //   } else if (slider.play) {
      //     console.log(slider);
      //     slider.play();
      //   }
      // }

      const iArray = [
        "IWake",
        "ICome",
        "ISee",
        "ICry",
        "IHear",
        "ISuck",
        "IEat",
        "ISubmitt",
        "ICrawl",
        "ISnuggle",
        "ILaugh",
        "ISit",
        "IBalance",
        "IGrab",
        "IWalk",
        "IScream",
        "ICuddle",
        "ILook",
        "ITake",
        "ICarry",
        "IShit",
        "IFeed",
        "IRoam",
        "IDrive",
        "IPour",
        "ICast",
        "ISolidify",
        "",
        "",
        "ISurf",
        "",
        "ICarve",
        "IMold",
        "IDigitalize",
        "IChange",
        "ITalk",
        "IBomb",
        "IPaint",
        "IBuild",
        "IDestroy",
        "IDress",
        "",
        "IWould",
        "",
        "ICook",
        "IPee",
        "IProtect",
        "IRemember",
        "IFinish",
        "ISwear",
        "",
        "",
        "IConnect",
        "ICompute",
        "IRun",
        "IBike",
        "ISmash",
        "IDraw",
        "ISew",
        "IWeld",
        "IHammer",
        "",
        "ISwim",
        "IPass",
        "IStop",
        "IThink",
        "IScrew",
        "IClay",
        "IBurn",
        "IHeat",
        "IDraught",
        "IBuy",
        "ICapitalise",
        "IBurry",
        "IMarry",
        "IDie",
        "IBorn",
        "IBust",
        "IAruge",
        "IDefend",
        "IAm",
        "IDevalue",
        "IForgett",
        "IDisappear",
        "IVanish",
        "",
        "IBlow",
        "",
        "IManage",
        "IBuild",
        "ILinger",
        "IToss",
        "I",
        "",
        "IWish",
        "IDo",
        "IBehave",
        "ISuffer",
        "IPray",
        "IKick",
        "IListen",
        "IWrite",
        "IKnit",
        "IPonder",
        "ISlaughter",
        "IBring",
        "IMark",
        "ISeparate",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I",
        "",
        "IVoid",
        "INail",
        "IKnife",
        "ILeaf",
        "IStone",
        "IPad",
        "ISand",
        "IPhone",
        "IMug",
        "IWater",
        "ISlab",
        "IWood",
        "IApple",
        "IOrange",
        "IMac",
        "",
        "IPillar",
        "IHouse",
        "ITent",
        "IHut",
        "ISkyskrape",
        "ICastle",
        "IBin",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I",
        "I"
      ];

      onMount(async () => {
        slider = tns({
          container: iSlideEl,
          items: 1,
          axis: "vertical",
          speed: 600,
          controls: false,
          nav: false,
          autoplay: true,
          mouseDrag: false,
          touch: false,
          autoplayTimeout: 2000,
          autoplayButtonOutput: false,
          autoplayText: false
        });

        slider.events.on("indexChanged", i => {
          if (!$menuActive) {
            try {
              let msg = new SpeechSynthesisUtterance(
                iArray[slider.getInfo().index - 1]
              );
              window.speechSynthesis.speak(msg);
            } catch (err) {
              console.error("💥 Speech synthesis error:", err);
            }
          }
        });

        let uid = "2bb57385c8df4e9bbe487a4be328a9a9";
        sketchFabClient = new Sketchfab(iframeEl);
        sketchFabClient.init(uid, {
          autospin: 0.1,
          autostart: 1,
          success: function onSuccess(api) {
            api.start();
            api.addEventListener("viewerready", function() {
              $$invalidate('loaded', loaded = true);
            });
          },
          error: function onError(err) {
            console.error("💥Viewer error", err);
          }
        });
      });

      onDestroy(async () => {
        iframeEl.remove();
        slider.destroy();
      });

    	function iframe_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('iframeEl', iframeEl = $$value);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('iSlideEl', iSlideEl = $$value);
    		});
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('iframeEl' in $$props) $$invalidate('iframeEl', iframeEl = $$props.iframeEl);
    		if ('iSlideEl' in $$props) $$invalidate('iSlideEl', iSlideEl = $$props.iSlideEl);
    		if ('loaded' in $$props) $$invalidate('loaded', loaded = $$props.loaded);
    		if ('sketchFabClient' in $$props) sketchFabClient = $$props.sketchFabClient;
    		if ('slider' in $$props) slider = $$props.slider;
    		if ('$menuActive' in $$props) menuActive.set($menuActive);
    	};

    	return {
    		iframeEl,
    		iSlideEl,
    		loaded,
    		iArray,
    		iframe_binding,
    		div3_binding
    	};
    }

    class OlofMarsja extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "OlofMarsja", options, id: create_fragment$8.name });
    	}
    }

    /* src/alina-chaiderov/AlinaChaiderov.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/alina-chaiderov/AlinaChaiderov.svelte";

    // (82:0) {#if !$menuActive}
    function create_if_block$3(ctx) {
    	var iframe, iframe_intro;

    	const block = {
    		c: function create() {
    			iframe = element("iframe");
    			attr_dev(iframe, "title", "Alina Chaiderov");
    			attr_dev(iframe, "class", "embed-responsive-item svelte-zqzi32");
    			attr_dev(iframe, "src", "https://alinachaiderov.com/liquidfiction");
    			attr_dev(iframe, "allow", "encrypted-media");
    			iframe.allowFullscreen = true;
    			add_location(iframe, file$7, 82, 2, 1501);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, iframe, anchor);
    		},

    		i: function intro(local) {
    			if (!iframe_intro) {
    				add_render_callback(() => {
    					iframe_intro = create_in_transition(iframe, fade, { delay: 1000 });
    					iframe_intro.start();
    				});
    			}
    		},

    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(iframe);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(82:0) {#if !$menuActive}", ctx });
    	return block;
    }

    function create_fragment$9(ctx) {
    	var t, if_block_anchor;

    	var if_block = (!ctx.$menuActive) && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			document.title = "Alina Chaiderov | LIQUID FIKCTION";
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (!ctx.$menuActive) {
    				if (!if_block) {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else transition_in(if_block, 1);
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			transition_in(if_block);
    		},

    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $menuActive;

    	validate_store(menuActive, 'menuActive');
    	component_subscribe($$self, menuActive, $$value => { $menuActive = $$value; $$invalidate('$menuActive', $menuActive); });

    	

      activePage.set("alina");
      orbBackgroundOne.set("rgba(0,0,255,1)");
      orbBackgroundTwo.set("rgba(0,0,255,1)");

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$menuActive' in $$props) menuActive.set($menuActive);
    	};

    	return { $menuActive };
    }

    class AlinaChaiderov extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "AlinaChaiderov", options, id: create_fragment$9.name });
    	}
    }

    /* src/Landing.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/Landing.svelte";

    function create_fragment$a(ctx) {
    	var title_value, t0, div1, div0, t2, div3, div2;

    	document.title = title_value = ctx.titleOutput;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "LIQUID~";
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div2.textContent = "FICTION";
    			attr_dev(div0, "class", "logo2 svelte-c7zhbr");
    			add_location(div0, file$8, 125, 2, 3019);
    			attr_dev(div1, "class", "pane top-left svelte-c7zhbr");
    			add_location(div1, file$8, 124, 0, 2989);
    			attr_dev(div2, "class", "logo2 svelte-c7zhbr");
    			add_location(div2, file$8, 129, 2, 3091);
    			attr_dev(div3, "class", "pane top-right svelte-c7zhbr");
    			add_location(div3, file$8, 128, 0, 3060);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.titleOutput) && title_value !== (title_value = ctx.titleOutput)) {
    				document.title = title_value;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(div1);
    				detach_dev(t2);
    				detach_dev(div3);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    let titleAnimation = "LIQUID FICTION";

    let titleIndex = 0;

    function instance$a($$self) {
    	

      activePage.set("landing");
      orbBackgroundOne.set("rgba(0,0,0,1)");
      orbColorOne.set("rgba(0,0,255,1)");

      orbBackgroundTwo.set("rgba(0,0,255,1)");
      orbColorTwo.set("rgba(255,255,255,1)");
      let titleOutput = titleAnimation;
      let titleLength = titleAnimation.length;

      // setInterval(() => {
      //   console.log(titleAnimation.length);
      //   if (titleIndex <= titleLength) {
      //     let temp = Array.from(titleAnimation).map((c, i) => {
      //       console.log(c, i);
      //       if (i >= titleIndex) {
      //         return c;
      //       } else {
      //         return "~";
      //       }
      //     });
      //     console.log(temp);
      //     titleOutput = temp.join("");
      //     titleIndex += 1;
      //   } else {
      //     titleOutput = titleAnimation;
      //     titleIndex = 0;
      //   }
      // }, 400);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('titleAnimation' in $$props) titleAnimation = $$props.titleAnimation;
    		if ('titleOutput' in $$props) $$invalidate('titleOutput', titleOutput = $$props.titleOutput);
    		if ('titleLength' in $$props) titleLength = $$props.titleLength;
    		if ('titleIndex' in $$props) titleIndex = $$props.titleIndex;
    	};

    	return { titleOutput };
    }

    class Landing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Landing", options, id: create_fragment$a.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    // (76:0) <Router>
    function create_default_slot$1(ctx) {
    	var t0, t1, t2, t3, current;

    	var route0 = new Route({
    		props: { path: "/", component: Landing },
    		$$inline: true
    	});

    	var route1 = new Route({
    		props: {
    		path: "/publication",
    		component: Publication
    	},
    		$$inline: true
    	});

    	var route2 = new Route({
    		props: { path: "eeefff", component: EEEFFF },
    		$$inline: true
    	});

    	var route3 = new Route({
    		props: {
    		path: "olof-marsja",
    		component: OlofMarsja
    	},
    		$$inline: true
    	});

    	var route4 = new Route({
    		props: {
    		path: "alina-chaiderov",
    		component: AlinaChaiderov
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			route0.$$.fragment.c();
    			t0 = space();
    			route1.$$.fragment.c();
    			t1 = space();
    			route2.$$.fragment.c();
    			t2 = space();
    			route3.$$.fragment.c();
    			t3 = space();
    			route4.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route3, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(route4, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);

    			transition_in(route1.$$.fragment, local);

    			transition_in(route2.$$.fragment, local);

    			transition_in(route3.$$.fragment, local);

    			transition_in(route4.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			destroy_component(route1, detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_component(route2, detaching);

    			if (detaching) {
    				detach_dev(t2);
    			}

    			destroy_component(route3, detaching);

    			if (detaching) {
    				detach_dev(t3);
    			}

    			destroy_component(route4, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(76:0) <Router>", ctx });
    	return block;
    }

    function create_fragment$b(ctx) {
    	var t0, t1, current;

    	var orb = new Orb({ $$inline: true });

    	var erosionmachine = new ErosionMachine({ $$inline: true });

    	var router = new Router({
    		props: {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			orb.$$.fragment.c();
    			t0 = space();
    			erosionmachine.$$.fragment.c();
    			t1 = space();
    			router.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(orb, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(erosionmachine, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.$$scope) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(orb.$$.fragment, local);

    			transition_in(erosionmachine.$$.fragment, local);

    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(orb.$$.fragment, local);
    			transition_out(erosionmachine.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(orb, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			destroy_component(erosionmachine, detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_component(router, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$b.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$b, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$b.name });
    	}
    }

    Sentry.init({
      dsn: 'https://421a3e5a32d94b149d5e1eccb8af6f24@sentry.io/1771039'
    });

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
