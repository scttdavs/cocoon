(function() {

  function hasClass(el, className) {
    if (el.classList) {
        el.classList.contains(className);
    } else {
        new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
    }
  }

  let matchesType;
  if (typeof Element !== 'undefined') { // so we don't break Node-side loading of this
      const types = [
          "matches", "matchesSelector",
          "webkitMatchesSelector", "mozMatchesSelector",
          "msMatchesSelector", "oMatchesSelector"
      ];
      for (let i = 0; i < types.length; i++) {
          const type = types[i];
          if (Element.prototype[type]) {
              matchesType = type;
              break;
          }
      }
  }

  function matches(el, selector) {
      return el[matchesType] && el[matchesType](selector);
  }

  function getNearest(el, selector) {
    if (!el) return null;
    if (matches(el, selector)) return el;
    return getNearest(el.parentNode, selector);
  }

  var cocoon_element_counter = 0;

  var create_new_id = function() {
    return (new Date().getTime() + cocoon_element_counter++);
  }

  var newcontent_braced = function(id) {
    return '[' + id + ']$1';
  }

  var newcontent_underscord = function(id) {
    return '_' + id + '_$1';
  }

  var getInsertionNodeElem = function(insertionNode, el){
    if (!insertionNode){
      return el.parentNode;
    }

    if (typeof insertionNode == 'string'){
      return insertionNode == "this" ? el : el.parentNode;
    }
  }

  document.addEventListener("click", function(e) {
    const add_fields = getNearest(e.target, '.add_fields');
    if (!add_fields) return;
    
    e.preventDefault();

    var assoc                 = add_fields.getAttribute('data-association'),
        assocs                = add_fields.getAttribute('data-associations'),
        content               = add_fields.getAttribute('data-association-insertion-template'),
        insertionNode         = add_fields.getAttribute('data-association-insertion-node'),
        count                 = parseInt(add_fields.getAttribute('count'), 10),
        regexp_braced         = new RegExp('\\[new_' + assoc + '\\](.*?\\s)', 'g'),
        regexp_underscord     = new RegExp('_new_' + assoc + '_(\\w*)', 'g'),
        new_id                = create_new_id(),
        new_content           = content.replace(regexp_braced, newcontent_braced(new_id)),
        new_contents          = [];


    if (new_content == content) {
      regexp_braced     = new RegExp('\\[new_' + assocs + '\\](.*?\\s)', 'g');
      regexp_underscord = new RegExp('_new_' + assocs + '_(\\w*)', 'g');
      new_content       = content.replace(regexp_braced, newcontent_braced(new_id));
    }

    new_content = new_content.replace(regexp_underscord, newcontent_underscord(new_id));
    new_contents = [new_content];

    count = (isNaN(count) ? 1 : Math.max(count, 1));
    count -= 1;

    while (count) {
      new_id      = create_new_id();
      new_content = content.replace(regexp_braced, newcontent_braced(new_id));
      new_content = new_content.replace(regexp_underscord, newcontent_underscord(new_id));
      new_contents.push(new_content);

      count -= 1;
    }

    var insertionNodeElem = getInsertionNodeElem(insertionNode, add_fields)

    if (!insertionNodeElem) ){
      console.warn("Couldn't find the element to insert the template. Make sure your `data-association-insertion-*` on `link_to_add_association` is correct.")
    }

    new_contents.forEach(function(node, i) {
      var div = document.createElement('div');
      div.innerHTML = node;
      var contentNode = div.firstChild;;

      var before_insert = new CustomEvent('cocoon:before-insert', { bubbles: true, detail: { insertedItem: contentNode } });
      insertionNodeElem.dispatchEvent(before_insert);

      if (!before_insert.defaultPrevented) {
        // allow any of the jquery dom manipulation methods (after, before, append, prepend, etc)
        // to be called on the node.  allows the insertion node to be the parent of the inserted
        // code and doesn't force it to be a sibling like after/before does. default: 'before'
        var parent = insertionNodeElem.parentNode;
        parent.insertBefore(contentNode, insertionNodeElem);

        insertionNodeElem.dispatchEvent(new CustomEvent('cocoon:after-insert', { bubbles: true, detail: { insertedItem: contentNode } }));
      }
    });

  });

  document.addEventListener("click", function(e) {
    const remove_fields_dynamic = getNearest(e.target, '.remove_fields.dynamic');
    const remove_fields_existing = getNearest(e.target, '.remove_fields.existing');

    const clicked = remove_fields_dynamic || remove_fields_existing;

    if (!clicked) return;

    var wrapper_class = clicked.getAttribute('wrapper-class') || 'nested-fields',
        node_to_delete = getNearest(clicked, '.' + wrapper_class),
        trigger_node = node_to_delete.parentNode;

    e.preventDefault();

    var before_remove = new CustomEvent('cocoon:before-remove', { bubbles: true, detail: { removedItem: node_to_delete } });
    trigger_node.dispatchEvent(before_remove);

    if (!before_remove.defaultPrevented) {
      var timeout = trigger_node.getAttribute('data-remove-timeout') || 0;

      setTimeout(function() {
        if (hasClass(clicked, 'dynamic')) {
          node_to_delete.parentNode.removeChild(node_to_delete);
        } else {
            var previous = clicked.previousElementSibling;
            if (matches(previous, "input[type=hidden]")) {
              previous.value = "1";
            }
            node_to_delete.style.display = "none";
        }
        var after_remove = new CustomEvent('cocoon:after-remove', { bubbles: true, detail: { removedItem: node_to_delete } });
        trigger_node.dispatchEvent(after_remove);
      }, timeout);
    }
  });

  var ready = function () {
    Array.prototype.slice.call(document.querySelectorAll('.remove_fields.existing.destroyed'))
      .forEach(function(el, i) {
        var wrapper_class = el.getAttribute('data-wrapper-class') || 'nested-fields';

        
        var nearest = getNearest(el, '.' + wrapper_class);
        if (nearest) nearest.style.display = "none";
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }

})();


