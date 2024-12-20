export class KDTree {
  constructor() {
    this.root = null;
  }

  insert(interactor, min, max) {
    // Create a new node for the interactor
    const node = {
      interactor: interactor,
      min: min,
      max: max,
      left: null,
      right: null
    };

    // Insert the node into the tree
    if (this.root === null) {
      this.root = node;
    } else {
      this._insert(this.root, node, 0);
    }
  }

  _insert(parent, node, depth) {
    // Choose the axis to split along
    const axis = depth % 2;

    // Insert the node into the left or right subtree
    if (node.min[axis] < parent.min[axis]) {
      if (parent.left === null) {
        parent.left = node;
      } else {
        this._insert(parent.left, node, depth + 1);
      }
    } else {
      if (parent.right === null) {
        parent.right = node;
      } else {
        this._insert(parent.right, node, depth + 1);
      }
    }
  }

  query(min, max) {
    // Create an array to store the query results
    const results = [];

    // Query the tree
    this._query(this.root, min, max, results);

    // Return the results
    return results;
  }

  _query(node, min, max, results) {
    // Check if the node is a leaf
    if (node === null) {
      return;
    }

    // Check if the bounding box of the node intersects the query box
    if (min[0] <= node.max[0] && max[0] >= node.min[0] &&
        min[1] <= node.max[1] && max[1] >= node.min[1]) {
      // Add the interactor to the results
      results.push(node.interactor);
    }

    // Recursively query the left and right subtrees
    this._query(node.left, min, max, results);
    this._query(node.right, min, max, results);
  }
  inOrder(node, callback) {
    if (node !== null) {
      this.inOrder(node.left, callback);
      callback(node);
      this.inOrder(node.right, callback);
    }
  }
  /*
   * You can call this method by passing the root of the tree and a callback function that will be called on each node during the traversal:
   kdTree.inOrder(kdTree.root, (node) => {
    console.log(node);
});
   */
    delete(interactor) {
    // Helper function to find the node to delete
    function findNode(node, interactor) {
      if (node === null) {
        return null;
      } else if (node.interactor === interactor) {
        return node;
      } else if (node.left !== null && node.left.interactor === interactor) {
        return node.left;
      } else if (node.right !== null && node.right.interactor === interactor) {
        return node.right;
      } else if (node.left !== null) {
        return findNode(node.left, interactor);
      } else if (node.right !== null) {
        return findNode(node.right, interactor);
      } else {
        return null;
      }
    }

    // Find the node to delete
    const node = findNode(this.root, interactor);
    if (node === null) {
      return;
    }

    // Helper function to find the in-order predecessor or successor
    function findSuccessor(node) {
      if (node.left === null) {
        return node;
      } else {
        return findSuccessor(node.left);
      }
    }

    // Handle the case where the node has no children
    if (node.left === null && node.right === null) {
      if (node === this.root) {
        this.root = null;
        } else {
          const parent = findNode(this.root, node.interactor);
          if (parent.left === node) {
            parent.left = null;
          } else {
            parent.right = null;
          }
        }
      }
      // Handle the case where the node has one child
      else if (node.left === null || node.right === null) {
        if (node === this.root) {
          this.root = node.left || node.right;
        } else {
            const parent = findNode(this.root, node.interactor);
          if (parent.left === node) {
            parent.left = node.left || node.right;
          } else {
            parent.right = node.left || node.right;
          }
        }
      }
      // Handle the case where the node has two children
      else {
        const successor = findSuccessor(node.right);
        node.interactor = successor.interactor;
        node.min = successor.min;
        node.max = successor.max;
        this.delete(successor.interactor);
      }
  }
}

