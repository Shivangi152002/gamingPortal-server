import express from 'express';
import { authenticateSession } from '../middleware/auth.js';
import { getCategoryFilterDataFromS3, updateCategoryFilterDataInS3 } from '../utils/categoryFilterManager.js';

const router = express.Router();

// GET all category filters - Public endpoint
router.get('/', async (req, res, next) => {
  try {
    const categoryFilterData = await getCategoryFilterDataFromS3();
    res.json({
      success: true,
      data: categoryFilterData
    });
  } catch (error) {
    next(error);
  }
});

// GET single category filter by ID - Public endpoint
router.get('/:categoryId', async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const categoryFilterData = await getCategoryFilterDataFromS3();
    const category = categoryFilterData.categories?.find(c => c.id === categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category filter not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// POST new category filter - Protected endpoint
router.post('/', authenticateSession, async (req, res, next) => {
  try {
    const categoryFilterData = await getCategoryFilterDataFromS3();
    
    if (!categoryFilterData.categories) {
      categoryFilterData.categories = [];
    }

    const newCategory = {
      id: req.body.id || `category_${Date.now()}`,
      name: req.body.name,
      icon: req.body.icon || '',
      enabled: req.body.enabled !== undefined ? req.body.enabled : true,
      sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : categoryFilterData.categories.length,
      translations: req.body.translations || { en: '', hi: '', es: '', fr: '' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check if category already exists
    const existingIndex = categoryFilterData.categories.findIndex(c => c.id === newCategory.id);
    if (existingIndex !== -1) {
      return res.status(400).json({
        success: false,
        message: 'Category filter already exists. Use PUT to update.'
      });
    }

    categoryFilterData.categories.push(newCategory);
    await updateCategoryFilterDataInS3(categoryFilterData);

    res.status(201).json({
      success: true,
      message: 'Category filter added successfully',
      data: newCategory
    });
  } catch (error) {
    next(error);
  }
});

// PUT update category filter - Protected endpoint
router.put('/:categoryId', authenticateSession, async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const categoryFilterData = await getCategoryFilterDataFromS3();
    
    const categoryIndex = categoryFilterData.categories?.findIndex(c => c.id === categoryId);

    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category filter not found'
      });
    }

    // Update category filter
    const updatedCategory = {
      ...categoryFilterData.categories[categoryIndex],
      name: req.body.name !== undefined ? req.body.name : categoryFilterData.categories[categoryIndex].name,
      icon: req.body.icon !== undefined ? req.body.icon : categoryFilterData.categories[categoryIndex].icon,
      enabled: req.body.enabled !== undefined ? req.body.enabled : categoryFilterData.categories[categoryIndex].enabled,
      sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : categoryFilterData.categories[categoryIndex].sortOrder,
      translations: req.body.translations !== undefined ? req.body.translations : categoryFilterData.categories[categoryIndex].translations,
      updatedAt: new Date().toISOString()
    };

    categoryFilterData.categories[categoryIndex] = updatedCategory;
    await updateCategoryFilterDataInS3(categoryFilterData);

    res.json({
      success: true,
      message: 'Category filter updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    next(error);
  }
});

// DELETE category filter - Protected endpoint
router.delete('/:categoryId', authenticateSession, async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const categoryFilterData = await getCategoryFilterDataFromS3();
    
    const categoryIndex = categoryFilterData.categories?.findIndex(c => c.id === categoryId);

    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category filter not found'
      });
    }

    const deletedCategory = categoryFilterData.categories[categoryIndex];
    categoryFilterData.categories.splice(categoryIndex, 1);
    await updateCategoryFilterDataInS3(categoryFilterData);

    res.json({
      success: true,
      message: 'Category filter deleted successfully',
      data: deletedCategory
    });
  } catch (error) {
    next(error);
  }
});

// POST reorder category filters - Protected endpoint
router.post('/reorder', authenticateSession, async (req, res, next) => {
  try {
    const { categories } = req.body;
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories must be an array'
      });
    }

    const categoryFilterData = await getCategoryFilterDataFromS3();
    
    // Update sortOrder for each category
    categories.forEach(({ id, sortOrder }) => {
      const categoryIndex = categoryFilterData.categories.findIndex(c => c.id === id);
      if (categoryIndex !== -1) {
        categoryFilterData.categories[categoryIndex].sortOrder = sortOrder;
        categoryFilterData.categories[categoryIndex].updatedAt = new Date().toISOString();
      }
    });

    // Sort categories by sortOrder
    categoryFilterData.categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    await updateCategoryFilterDataInS3(categoryFilterData);

    res.json({
      success: true,
      message: 'Category filters reordered successfully',
      data: categoryFilterData
    });
  } catch (error) {
    next(error);
  }
});

export default router;

